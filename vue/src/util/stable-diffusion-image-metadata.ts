import { unescapeHtml } from '.'

// Fork from https://github.com/jiw0220/stable-diffusion-image-metadata/blob/main/src/index.ts
type ImageMeta = {
  prompt?: string;
  negativePrompt?: string;
  steps?: string;
  sampler?: string;
  cfgScale?: string;
  seed?: string;
  clipSkip?: string;
  hashes?: { [k: string]: any };
  width?: number;
  height?: number;
  resources?: Resource[];
} & Record<string, any>;

type Resource = {
  type: string;
  name: string;
  weight?: number;
  hash?: string;
};

type PreProcessValueFn = (v: string) => string;
type PreProcessValue = string;

const imageMetadataKeys: Array<[string, string]> = [
  ['Seed', 'seed'],
  ['CFG scale', 'cfgScale'],
  ['Sampler', 'sampler'],
  ['Steps', 'steps'],
  ['Clip skip', 'clipSkip'],
  ['Size', 'size'],
];
const imageMetaKeyMap = new Map<string, string>(imageMetadataKeys);
const automaticExtraNetsRegex = /<(lora|hypernet):([a-zA-Z0-9_.]+):([0-9.]+)>/g;
const automaticNameHash = /([a-zA-Z0-9_.]+)\(([a-zA-Z0-9]+)\)/;
const getImageMetaKey = (key: string, keyMap: Map<string, string>) => keyMap.get(key.trim()) ?? key.trim();
const stripKeys = ['Template: ', 'Negative Template: '] as const;

function preproccessFormatJSONValueFn(v: string) {
  try {
    return JSON.parse(encodeURIComponent(v));
  } catch (e) {
    return v;
  }
}

function preproccessFormatHandler(configValue: PreProcessValue | PreProcessValueFn, inputValue: string) {
  if (typeof configValue === 'function') {
    return configValue.call(null, inputValue);
  }
  return configValue;
}


const tryParseJson = (v: string) => {
  try {
    return JSON.parse(v);
  } catch (e) {
    return v;
  }

}

const preproccessConfigs = [
  { reg: /(ControlNet \d+): "([^"]+)"/g },
  { reg: /(Lora hashes): "([^"]+)"/g },
  { reg: /(Hashes): ({[^}]+})/g, key: 'hashes', value: preproccessFormatJSONValueFn },
  //...There should be many configs that need to be preprocessed in the future
];

export function parse(parameters: string): ImageMeta {
  const metadata: ImageMeta = {};
  if (!parameters) return metadata;

  const metaLines = parameters.split('\n').filter((line) => {
    return line.trim() !== '' && !stripKeys.some((key) => line.startsWith(key));
  });

  const detailsLineIndex = metaLines.findIndex((line) => line.startsWith('Steps: '));
  let detailsLine = metaLines[detailsLineIndex] || '';
  // Strip it from the meta lines
  if (detailsLineIndex > -1) metaLines.splice(detailsLineIndex, 1);
  // Remove meta keys I wish I hadn't made... :(
  detailsLine = unescapeHtml(detailsLine)
  const preprecessedMatchValuesList = [] as any[];
  preproccessConfigs.forEach(({ reg, key: configKey, value: configValue }) => {
    const matchData: any = {};
    const matchValues = [];
    let match;
    while ((match = reg.exec(detailsLine)) !== null) {
      const key = configKey !== void 0 ? preproccessFormatHandler(configKey, match[1]) : match[1];
      const value = configValue !== void 0 ? preproccessFormatHandler(configValue, match[2]) : match[2];
      matchData[key] = value;
      matchValues.push(match[0]);
    }
    matchValues.forEach((value) => (detailsLine = detailsLine.replace(value, '')));
    preprecessedMatchValuesList.push(matchData);
  });

  const regex = /\s*([\w ]+):\s*("(?:\\"[^,]|\\"|\\|[^"])+"|[^,]*)(?:,|$)/g;
  let match;
  while ((match = regex.exec(detailsLine)) !== null) {
    let k = match[1];
    const v = match[2].replace(/\\(.)/g, '$1');
    if (!k) continue;
    k = getImageMetaKey(k, imageMetaKeyMap);
    metadata[k.trim()] = tryParseJson((v ?? '').trim());
  }

  // 这些信息不是很重要，所以推后
  preprecessedMatchValuesList.forEach((matchData) => {
    
    Object.assign(metadata, matchData);
  });

  // Extract prompts
  const [prompt, ...negativePrompt] = metaLines
    .join('\n')
    .split('Negative prompt:')
    .map((x) => x.trim());
  metadata.prompt = prompt;
  metadata.negativePrompt = negativePrompt.join(' ').trim();

  // Extract resources
  const extranets = [...prompt.matchAll(automaticExtraNetsRegex)];
  const resources: Resource[] = extranets.map(([, type, name, weight]) => ({
    type,
    name,
    weight: parseFloat(weight),
  }));

  if (metadata.Size || metadata.size) {
    const sizes = (metadata.Size || metadata.size || '0x0').split('x');
    if (!metadata.width) {
      metadata.width = parseFloat(sizes[0]) || 0;
    }
    if (!metadata.height) {
      metadata.height = parseFloat(sizes[1]) || 0;
    }
  }

  if (metadata['Model'] && metadata['Model hash']) {
    const model = metadata['Model'] as string;
    const modelHash = metadata['Model hash'] as string;
    if (typeof metadata.hashes !== 'object') metadata.hashes = {};
    if (!metadata.hashes['model']) metadata.hashes['model'] = modelHash;

    resources.push({
      type: 'model',
      name: model,
      hash: modelHash,
    });
  }

  if (metadata['Hypernet'] && metadata['Hypernet strength'])
    resources.push({
      type: 'hypernet',
      name: metadata['Hypernet'] as string,
      weight: parseFloat(metadata['Hypernet strength'] as string),
    });

  if (metadata['AddNet Enabled'] === 'True') {
    let i = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const fullname = metadata[`AddNet Model ${i}`] as string;
      if (!fullname) break;
      const [, name, hash] = fullname.match(automaticNameHash) ?? [];

      resources.push({
        type: (metadata[`AddNet Module ${i}`] as string).toLowerCase(),
        name,
        hash,
        weight: parseFloat(metadata[`AddNet Weight ${i}`] as string),
      });
      i++;
    }
  }

  metadata.resources = resources;
  return metadata;
}

