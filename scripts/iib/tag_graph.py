"""
Tag relationship graph generation for topic clusters.
Builds a weighted graph showing connections between tags from cluster keywords.
"""

import hashlib
import json
import math
from typing import Dict, List, Optional, Set, Tuple
from pydantic import BaseModel
from fastapi import Depends, FastAPI, HTTPException

from scripts.iib.db.datamodel import DataBase, TopicClusterCache


class TagGraphReq(BaseModel):
    folder_paths: List[str]
    model: Optional[str] = None
    threshold: Optional[float] = 0.90
    min_cluster_size: Optional[int] = 2
    lang: Optional[str] = None
    # Graph parameters
    top_n_tags: Optional[int] = 50
    top_n_clusters: Optional[int] = 20
    weight_mode: Optional[str] = "hybrid"  # frequency / tfidf / hybrid
    alpha: Optional[float] = 0.3  # for hybrid mode
    show_clusters: Optional[bool] = True
    detect_communities: Optional[bool] = True


class TagNode(BaseModel):
    id: str
    label: str
    weight: float
    image_count: int
    cluster_count: int
    category: str
    community: Optional[int] = None


class ClusterNode(BaseModel):
    id: str
    label: str
    weight: float
    size: int
    category: str = "cluster"
    community: Optional[int] = None


class GraphLink(BaseModel):
    source: str
    target: str
    weight: float
    image_count: Optional[int] = None
    cluster_count: Optional[int] = None


class TagGraphResp(BaseModel):
    nodes: List[dict]  # TagNode or ClusterNode
    links: List[GraphLink]
    communities: Optional[List[dict]] = None
    stats: dict


def mount_tag_graph_routes(
    app: FastAPI,
    db_api_base: str,
    verify_secret,
    embedding_model: str,
    ai_model: str,
):
    """Mount tag relationship graph endpoints"""

    def _get_cluster_cache_key(req: TagGraphReq, model: str) -> str:
        """Compute cache key for cluster result lookup"""
        from scripts.iib.topic_cluster import _PROMPT_NORMALIZE_VERSION, _PROMPT_NORMALIZE_MODE

        cache_params = {
            "model": model,
            "threshold": float(req.threshold or 0.90),
            "min_cluster_size": int(req.min_cluster_size or 2),
            "assign_noise_threshold": None,
            "title_model": None,
            "lang": str(req.lang or ""),
            "nv": _PROMPT_NORMALIZE_VERSION,
            "nm": _PROMPT_NORMALIZE_MODE,
        }
        h = hashlib.sha1()
        h.update(
            json.dumps(
                {"folders": sorted(req.folder_paths), "params": cache_params},
                ensure_ascii=False,
                sort_keys=True,
            ).encode("utf-8")
        )
        return h.hexdigest()

    def _infer_tag_category(tag: str) -> str:
        """Infer tag category from content"""
        tag_lower = tag.lower()

        # Character
        char_keywords = [
            "girl", "boy", "woman", "man", "character", "person",
            "女孩", "男孩", "女性", "男性", "人物", "角色", "战士", "精灵"
        ]
        if any(k in tag_lower for k in char_keywords):
            return "character"

        # Style
        style_keywords = [
            "style", "punk", "sci-fi", "fantasy", "realistic", "anime",
            "风格", "朋克", "科幻", "奇幻", "写实", "动漫", "赛博"
        ]
        if any(k in tag_lower for k in style_keywords):
            return "style"

        # Scene
        scene_keywords = [
            "forest", "city", "mountain", "ocean", "indoor", "outdoor", "landscape",
            "森林", "城市", "山", "海", "室内", "室外", "风景", "场景"
        ]
        if any(k in tag_lower for k in scene_keywords):
            return "scene"

        # Object
        object_keywords = [
            "sword", "weapon", "machine", "building", "vehicle",
            "机甲", "武器", "建筑", "车", "剑"
        ]
        if any(k in tag_lower for k in object_keywords):
            return "object"

        return "other"

    def _detect_communities(nodes: List[dict], links: List[GraphLink]) -> Optional[List[dict]]:
        """Detect communities using Louvain algorithm"""
        try:
            import networkx as nx
            from networkx.algorithms import community
        except ImportError:
            return None

        # Build graph
        G = nx.Graph()
        for node in nodes:
            G.add_node(node["id"], weight=node["weight"])

        for link in links:
            if G.has_node(link.source) and G.has_node(link.target):
                G.add_edge(link.source, link.target, weight=link.weight)

        if len(G.nodes()) < 2:
            return None

        # Detect communities
        try:
            communities = community.louvain_communities(G, weight="weight", resolution=1.0)
        except Exception:
            return None

        # Format result
        result = []
        node_to_community = {}
        for idx, comm in enumerate(communities):
            comm_list = list(comm)
            result.append({
                "id": idx,
                "nodes": comm_list,
                "size": len(comm_list),
            })
            for node_id in comm_list:
                node_to_community[node_id] = idx

        # Assign community to nodes
        for node in nodes:
            node["community"] = node_to_community.get(node["id"], -1)

        return result

    @app.post(
        f"{db_api_base}/cluster_tag_graph",
        dependencies=[Depends(verify_secret)],
    )
    async def cluster_tag_graph(req: TagGraphReq):
        """
        Build tag relationship graph from clustering results.
        Returns nodes (tags + clusters) and weighted edges.
        """
        # Validate
        if not req.folder_paths:
            raise HTTPException(400, "folder_paths is required")

        folders = sorted(req.folder_paths)
        model = req.model or embedding_model

        # Get cached cluster result
        conn = DataBase.get_conn()
        cache_key = _get_cluster_cache_key(req, model)
        cached = TopicClusterCache.get(conn, cache_key)

        if not cached or not isinstance(cached.get("result"), dict):
            raise HTTPException(
                400,
                "No clustering result found. Please run clustering first."
            )

        result = cached["result"]
        clusters = result.get("clusters", [])

        if not clusters:
            raise HTTPException(400, "No clusters found in result")

        # 1. Collect tag statistics
        tag_stats: Dict[str, Dict] = {}
        total_images = sum(c.get("size", 0) for c in clusters)

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
                        "clusters": [],
                        "total_images": 0,
                    }

                tag_stats[keyword]["clusters"].append(cluster_id)
                tag_stats[keyword]["total_images"] += cluster_size

        # 2. Calculate tag weights
        tag_nodes = []
        alpha = float(req.alpha or 0.3)

        for tag, stats in tag_stats.items():
            cluster_count = len(stats["clusters"])
            image_count = stats["total_images"]

            # Frequency weight
            freq_weight = float(image_count)

            # TF-IDF weight
            idf = math.log(len(clusters) / max(cluster_count, 1))
            tfidf_weight = freq_weight * idf

            # Hybrid weight
            if req.weight_mode == "frequency":
                weight = freq_weight
            elif req.weight_mode == "tfidf":
                weight = tfidf_weight
            else:  # hybrid
                weight = alpha * freq_weight + (1 - alpha) * tfidf_weight

            tag_nodes.append({
                "id": f"tag_{tag}",
                "label": tag,
                "weight": weight,
                "image_count": image_count,
                "cluster_count": cluster_count,
                "category": _infer_tag_category(tag),
            })

        # 3. Filter top-N tags
        top_n_tags = req.top_n_tags or 50
        tag_nodes = sorted(tag_nodes, key=lambda x: x["weight"], reverse=True)[:top_n_tags]
        selected_tags = {node["label"] for node in tag_nodes}

        # 4. Calculate tag-tag co-occurrence
        tag_pairs: Dict[Tuple[str, str], Dict] = {}

        for cluster in clusters:
            keywords = cluster.get("keywords", [])
            keywords = [k for k in keywords if k in selected_tags]
            cluster_size = cluster.get("size", 0)
            cluster_id = cluster.get("id", "")

            for i in range(len(keywords)):
                for j in range(i + 1, len(keywords)):
                    tag1, tag2 = sorted([keywords[i], keywords[j]])
                    key = (tag1, tag2)

                    if key not in tag_pairs:
                        tag_pairs[key] = {
                            "clusters": [],
                            "images": 0,
                        }

                    tag_pairs[key]["clusters"].append(cluster_id)
                    tag_pairs[key]["images"] += cluster_size

        # 5. Build tag-tag links
        tag_links = []
        for (tag1, tag2), stats in tag_pairs.items():
            tag_links.append(
                GraphLink(
                    source=f"tag_{tag1}",
                    target=f"tag_{tag2}",
                    weight=float(stats["images"]),
                    image_count=stats["images"],
                    cluster_count=len(stats["clusters"]),
                )
            )

        # 6. Add cluster nodes (if requested)
        cluster_nodes = []
        cluster_links = []

        if req.show_clusters:
            # Filter top-N clusters by size
            top_n_clusters = req.top_n_clusters or 20
            top_clusters = sorted(clusters, key=lambda c: c.get("size", 0), reverse=True)[:top_n_clusters]

            for cluster in top_clusters:
                cluster_id = cluster.get("id", "")
                cluster_title = cluster.get("title", "Untitled")
                cluster_size = cluster.get("size", 0)
                keywords = cluster.get("keywords", [])

                cluster_nodes.append({
                    "id": f"cluster_{cluster_id}",
                    "label": cluster_title,
                    "weight": float(cluster_size),
                    "size": cluster_size,
                    "category": "cluster",
                })

                # Link cluster to its tags
                for keyword in keywords:
                    if keyword in selected_tags:
                        cluster_links.append(
                            GraphLink(
                                source=f"cluster_{cluster_id}",
                                target=f"tag_{keyword}",
                                weight=float(cluster_size),
                            )
                        )

        # 7. Combine all nodes and links
        all_nodes = tag_nodes + cluster_nodes
        all_links = [link.dict() for link in (tag_links + cluster_links)]

        # 8. Community detection
        communities = None
        if req.detect_communities:
            communities = _detect_communities(all_nodes, tag_links + cluster_links)

        # 9. Build response
        return TagGraphResp(
            nodes=all_nodes,
            links=all_links,
            communities=communities,
            stats={
                "total_tags": len(tag_stats),
                "selected_tags": len(tag_nodes),
                "total_clusters": len(clusters),
                "selected_clusters": len(cluster_nodes),
                "total_images": total_images,
                "tag_links": len(tag_links),
                "cluster_links": len(cluster_links),
            },
        )
