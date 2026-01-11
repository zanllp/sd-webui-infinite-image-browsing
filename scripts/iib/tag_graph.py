"""
Hierarchical tag graph generation for topic clusters.
Builds a multi-layer neural-network-style visualization with LLM-driven abstraction.
"""

import hashlib
import json
from typing import Dict, List, Optional
from pydantic import BaseModel
from fastapi import Depends, FastAPI, HTTPException

from scripts.iib.db.datamodel import DataBase, GlobalSetting
from scripts.iib.tool import normalize_output_lang

# Cache version for tag abstraction - increment to invalidate all caches
TAG_ABSTRACTION_CACHE_VERSION = 2


class TagGraphReq(BaseModel):
    folder_paths: List[str]
    lang: Optional[str] = "en"  # Language for LLM output


class LayerNode(BaseModel):
    id: str
    label: str
    size: float  # Weight/importance of this node
    metadata: Optional[dict] = None


class GraphLayer(BaseModel):
    level: int
    name: str  # Layer name: "Clusters", "Tags", "Abstract-1", "Abstract-2"
    nodes: List[LayerNode]


class GraphLink(BaseModel):
    source: str
    target: str
    weight: float


class TagGraphResp(BaseModel):
    layers: List[GraphLayer]
    links: List[GraphLink]
    stats: dict


def mount_tag_graph_routes(
    app: FastAPI,
    db_api_base: str,
    verify_secret,
    embedding_model: str,
    ai_model: str,
    openai_base_url: str,
    openai_api_key: str,
):
    """Mount hierarchical tag graph endpoints"""

    async def _call_llm_for_abstraction(
        tags: List[str],
        lang: str,
        model: str,
        base_url: str,
        api_key: str
    ) -> dict:
        """
        Call LLM to create hierarchical abstraction of tags.
        Returns a dict with layers and groupings.
        """
        import asyncio
        import requests
        import re

        def _normalize_base_url(url: str) -> str:
            url = url.strip()
            if not url.startswith(("http://", "https://")):
                url = f"https://{url}"
            return url.rstrip("/")

        def _call_sync():
            if not api_key:
                raise HTTPException(500, "OpenAI API Key not configured")

            url = f"{_normalize_base_url(base_url)}/chat/completions"
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

            # Normalize language for consistent LLM output
            normalized_lang = normalize_output_lang(lang)
            sys_prompt = f"""You are a tag categorization assistant. Organize tags into hierarchical categories.

STRICT RULES:
1. Create 5-15 Level 1 categories (broad groupings)
2. Optionally create 2-5 Level 2 super-categories IF Level 1 has 8+ categories
3. Every tag must belong to exactly ONE Level 1 category
4. Use {normalized_lang} for all category labels
5. Category IDs must be simple lowercase (e.g., "style", "char", "scene1")

OUTPUT ONLY VALID JSON - NO markdown, NO explanations, NO extra text:
{{"layers":[{{"level":1,"groups":[{{"id":"cat1","label":"Label1","tags":["tag1"]}},{{"id":"cat2","label":"Label2","tags":["tag2"]}}]}},{{"level":2,"groups":[{{"id":"super1","label":"SuperLabel","categories":["cat1","cat2"]}}]}}]}}

If unsure about Level 2, OMIT it entirely. Start response with {{ and end with }}"""

            user_prompt = f"Tags to categorize:\n{', '.join(tags)}"

            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.0,
                "max_tokens": 2048,
            }

            # Retry up to 5 times
            last_error = ""
            for attempt in range(1, 6):
                try:
                    resp = requests.post(url, json=payload, headers=headers, timeout=60)
                except requests.RequestException as e:
                    last_error = f"network_error: {type(e).__name__}: {e}"
                    continue

                # Retry on 429 or 5xx, fail immediately on other 4xx
                if resp.status_code != 200:
                    body = (resp.text or "")[:400]
                    if resp.status_code == 429 or resp.status_code >= 500:
                        last_error = f"api_error_retriable: status={resp.status_code}"
                        continue
                    # 4xx client error - fail immediately
                    raise Exception(f"API client error: {resp.status_code} {body}")

                try:
                    data = resp.json()
                except Exception as e:
                    last_error = f"response_not_json: {type(e).__name__}"
                    continue

                choice0 = (data.get("choices") or [{}])[0]
                msg = (choice0 or {}).get("message") or {}
                content = (msg.get("content") or "").strip()

                # Extract JSON from content - try multiple strategies
                json_str = None

                # Strategy 1: Direct parse (if response is pure JSON)
                try:
                    result = json.loads(content)
                    if isinstance(result, dict) and "layers" in result:
                        return result
                except:
                    pass

                # Strategy 2: Extract JSON from markdown code blocks
                code_block = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", content)
                if code_block:
                    json_str = code_block.group(1)
                else:
                    # Strategy 3: Find largest JSON object
                    m = re.search(r"\{[\s\S]*\}", content)
                    if m:
                        json_str = m.group(0)

                if not json_str:
                    last_error = f"no_json_found: {content[:200]}"
                    continue

                # Clean up common JSON issues
                json_str = json_str.strip()
                # Remove trailing commas before closing braces/brackets
                json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)

                try:
                    result = json.loads(json_str)
                except json.JSONDecodeError as e:
                    last_error = f"json_parse_error: {e}"
                    continue

                # Validate structure
                if not isinstance(result, dict) or "layers" not in result:
                    last_error = f"invalid_structure: {str(result)[:200]}"
                    continue

                # Success!
                return result

            # All retries exhausted
            # Fallback: create simple heuristic grouping
            # Group by first character/prefix for basic organization
            groups_dict = {}
            for tag in tags:
                # Simple heuristic: group by first 2 chars or common keywords
                prefix = tag[:2] if len(tag) >= 2 else tag
                if prefix not in groups_dict:
                    groups_dict[prefix] = []
                groups_dict[prefix].append(tag)

            # Merge small groups
            merged_groups = []
            for prefix, tag_list in sorted(groups_dict.items()):
                if len(merged_groups) > 0 and len(tag_list) < 3:
                    # Merge into last group if this group is too small
                    merged_groups[-1]["tags"].extend(tag_list)
                else:
                    group_id = f"group{len(merged_groups) + 1}"
                    label = f"Group {len(merged_groups) + 1}"
                    merged_groups.append({
                        "id": group_id,
                        "label": label,
                        "tags": tag_list
                    })

            # Limit to max 12 groups
            if len(merged_groups) > 12:
                # Merge smallest groups
                merged_groups = sorted(merged_groups, key=lambda g: len(g["tags"]), reverse=True)[:12]

            return {
                "layers": [
                    {
                        "level": 1,
                        "groups": merged_groups
                    }
                ]
            }

        return await asyncio.to_thread(_call_sync)

    @app.post(
        f"{db_api_base}/cluster_tag_graph",
        dependencies=[Depends(verify_secret)],
    )
    async def cluster_tag_graph(req: TagGraphReq):
        """
        Build hierarchical tag graph from clustering results.
        Returns multi-layer structure similar to neural network visualization.

        Layer structure (bottom to top):
        - Layer 0: Cluster nodes
        - Layer 1: Tag nodes (deduplicated cluster keywords)
        - Layer 2+: Abstract groupings (LLM-generated, max 2 layers)
        """
        # Validate
        if not req.folder_paths:
            raise HTTPException(400, "folder_paths is required")

        folders = sorted(req.folder_paths)

        # Get the latest cluster result for these folders
        conn = DataBase.get_conn()

        from contextlib import closing
        with closing(conn.cursor()) as cur:
            cur.execute(
                """SELECT cache_key, folders, result FROM topic_cluster_cache
                   ORDER BY updated_at DESC"""
            )
            rows = cur.fetchall()

        # Find a cache that matches the folders (order-independent)
        folders_set = set(folders)
        row = None

        for cache_row in rows:
            try:
                cached_folders = json.loads(cache_row[1]) if isinstance(cache_row[1], str) else cache_row[1]
                if isinstance(cached_folders, list) and set(cached_folders) == folders_set:
                    row = (cache_row[0], cache_row[2])
                    break
            except Exception:
                continue

        if not row:
            raise HTTPException(
                400,
                f"No clustering result found for these {len(folders)} folders. Please run clustering first."
            )

        cached_result = json.loads(row[1]) if isinstance(row[1], str) else row[1]

        if not cached_result or not isinstance(cached_result, dict):
            raise HTTPException(400, "Invalid clustering result format.")

        result = cached_result
        clusters = result.get("clusters", [])

        if not clusters:
            raise HTTPException(400, "No clusters found in result")

        # === Layer 0: Cluster Nodes ===
        top_clusters = sorted(clusters, key=lambda c: c.get("size", 0), reverse=True)

        cluster_nodes = []
        cluster_to_tags_links = []

        for cluster in top_clusters:
            cluster_id = cluster.get("id", "")
            cluster_title = cluster.get("title", "Untitled")
            cluster_size = cluster.get("size", 0)
            keywords = cluster.get("keywords", [])
            paths = cluster.get("paths", [])

            node_id = f"cluster_{cluster_id}"
            cluster_nodes.append(LayerNode(
                id=node_id,
                label=cluster_title,
                size=float(cluster_size),
                metadata={
                    "type": "cluster",
                    "image_count": cluster_size,
                    "paths": paths
                }
            ))

            # Store links from clusters to their tags (will be created later)
            for keyword in keywords:
                if keyword:
                    cluster_to_tags_links.append({
                        "cluster_id": node_id,
                        "tag": str(keyword).strip(),
                        "weight": float(cluster_size)
                    })

        # === Layer 1: Tag Nodes (deduplicated) ===
        tag_stats: Dict[str, Dict] = {}

        for cluster in clusters:
            keywords = cluster.get("keywords", [])
            cluster_size = cluster.get("size", 0)
            cluster_id = cluster.get("id", "")

            for keyword in keywords:
                keyword = str(keyword).strip()
                if not keyword:
                    continue

                if keyword not in tag_stats:
                    tag_stats[keyword] = {
                        "cluster_ids": [],
                        "total_images": 0,
                    }

                tag_stats[keyword]["cluster_ids"].append(cluster_id)
                tag_stats[keyword]["total_images"] += cluster_size

        # Filter and sort tags
        sorted_tags = sorted(
            tag_stats.items(),
            key=lambda x: x[1]["total_images"],
            reverse=True
        )

        tag_nodes = []
        selected_tags = set()

        for tag, stats in sorted_tags:
            tag_id = f"tag_{tag}"
            selected_tags.add(tag)
            tag_nodes.append(LayerNode(
                id=tag_id,
                label=tag,
                size=float(stats["total_images"]),
                metadata={
                    "type": "tag",
                    "cluster_count": len(stats["cluster_ids"]),
                    "image_count": stats["total_images"]
                }
            ))

        # Filter cluster->tag links to only include selected tags
        layer0_to_1_links = []
        for link in cluster_to_tags_links:
            if link["tag"] in selected_tags:
                layer0_to_1_links.append(GraphLink(
                    source=link["cluster_id"],
                    target=f"tag_{link['tag']}",
                    weight=link["weight"]
                ))

        # === Layer 2+: LLM-driven abstraction ===
        abstract_layers = []
        layer1_to_2_links = []

        if len(selected_tags) > 3:  # Only abstract if we have enough tags
            # Use language from request
            lang = req.lang or "en"

            # Generate cache key for this set of tags (with version)
            import hashlib
            tags_sorted = sorted(selected_tags)
            cache_input = f"v{TAG_ABSTRACTION_CACHE_VERSION}|{ai_model}|{lang}|{','.join(tags_sorted)}"
            cache_key_hash = hashlib.md5(cache_input.encode()).hexdigest()
            cache_key = f"tag_abstraction_v{TAG_ABSTRACTION_CACHE_VERSION}_{cache_key_hash}"

            # Try to get from cache
            abstraction = None
            try:
                cached_data = GlobalSetting.get_setting(conn, cache_key)
                if cached_data and isinstance(cached_data, dict):
                    abstraction = cached_data
            except:
                pass

            # Call LLM if not cached
            if not abstraction:
                abstraction = await _call_llm_for_abstraction(
                    list(selected_tags),
                    lang,
                    ai_model,
                    openai_base_url,
                    openai_api_key
                )

                # Save to cache if successful
                if abstraction and isinstance(abstraction, dict) and abstraction.get("layers"):
                    try:
                        GlobalSetting.save_setting(conn, cache_key, json.dumps(abstraction, ensure_ascii=False))
                    except Exception:
                        pass

            # Build abstract layers from LLM response
            llm_layers = abstraction.get("layers", [])

            for layer_info in llm_layers:
                level = layer_info.get("level", 1)
                groups = layer_info.get("groups", [])

                if not groups:
                    continue

                abstract_nodes = []

                # Process each group in this layer
                for group in groups:
                    group_id = f"abstract_l{level}_{group.get('id', 'unknown')}"
                    group_label = group.get("label", "Unnamed")

                    # Calculate size based on contained tags/categories
                    if "tags" in group:
                        # Level 1: references tags directly
                        contained_tags = group.get("tags", [])
                        total_size = sum(
                            tag_stats.get(tag, {}).get("total_images", 0)
                            for tag in contained_tags
                            if tag in selected_tags
                        )

                        abstract_nodes.append(LayerNode(
                            id=group_id,
                            label=group_label,
                            size=float(total_size),
                            metadata={"type": "abstract", "level": level}
                        ))

                        # Create links from tags to this abstract node
                        for tag in contained_tags:
                            if tag in selected_tags:
                                tag_id = f"tag_{tag}"
                                layer1_to_2_links.append(GraphLink(
                                    source=tag_id,
                                    target=group_id,
                                    weight=float(tag_stats.get(tag, {}).get("total_images", 1))
                                ))

                    elif "categories" in group and level == 2:
                        # Level 2: references Level 1 categories
                        # Calculate size from contained categories
                        contained_cats = group.get("categories", [])
                        total_size = 0.0

                        # Find size from level 1 nodes
                        level1_nodes = abstract_layers[0].nodes if abstract_layers else []
                        for cat_id in contained_cats:
                            full_cat_id = f"abstract_l1_{cat_id}"
                            for node in level1_nodes:
                                if node.id == full_cat_id:
                                    total_size += node.size
                                    break

                        abstract_nodes.append(LayerNode(
                            id=group_id,
                            label=group_label,
                            size=float(total_size),
                            metadata={"type": "abstract", "level": level}
                        ))

                        # Create links from Level 1 categories to this Level 2 node
                        for cat_id in contained_cats:
                            full_cat_id = f"abstract_l1_{cat_id}"
                            # Verify the category exists
                            if any(n.id == full_cat_id for n in level1_nodes):
                                layer1_to_2_links.append(GraphLink(
                                    source=full_cat_id,
                                    target=group_id,
                                    weight=total_size  # Use aggregated weight
                                ))

                if abstract_nodes:
                    abstract_layers.append(GraphLayer(
                        level=level + 1,  # +1 because Layer 0=clusters, Layer 1=tags
                        name=f"Abstract-{level}",
                        nodes=abstract_nodes
                    ))

        # === Build final response ===
        layers = [
            GraphLayer(level=0, name="Clusters", nodes=cluster_nodes),
            GraphLayer(level=1, name="Tags", nodes=tag_nodes),
        ] + abstract_layers

        all_links = [link.dict() for link in (layer0_to_1_links + layer1_to_2_links)]

        return TagGraphResp(
            layers=layers,
            links=all_links,
            stats={
                "total_clusters": len(clusters),
                "selected_clusters": len(cluster_nodes),
                "total_tags": len(tag_stats),
                "selected_tags": len(tag_nodes),
                "abstraction_layers": len(abstract_layers),
                "total_links": len(all_links),
            }
        )
