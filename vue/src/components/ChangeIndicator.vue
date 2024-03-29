
<script setup lang="ts">
import { CaretRightOutlined } from '@/icon'
import type { GenDiffInfo } from '@/api/files'

defineProps<{
  genDiffToPrevious: GenDiffInfo
  genDiffToNext: GenDiffInfo
  genInfo?: string
}>()

function filterManualProps(diff: Record<string, unknown>) {
  const manualProps = ['prompt', 'negativePrompt', 'seed', 'steps', 'cfgScale', 'size', 'Model', 'others']
  const otherKeys = Object.keys(diff).filter((key) => !manualProps.includes(key))
  return Object.fromEntries(otherKeys.map((key) => [key, diff[key]]))
}

function hasOtherProps(diff: Record<string, unknown>) {
  return Object.keys(filterManualProps(diff)).length > 0
}

</script>

<template>
    <div class="changeIndicatorWrapper">
        <div class="changeIndicatorsLeft changeIndicators" v-if="!genDiffToPrevious.empty">
            <div class="promptChangeIndicator changeIndicator" v-if="'prompt' in genDiffToPrevious.diff">P+</div>
            <div class="negpromptChangeIndicator changeIndicator" v-if="'negativePrompt' in genDiffToPrevious.diff">P-</div>
            <div class="seedChangeIndicator changeIndicator" v-if="'seed' in genDiffToPrevious.diff">Se</div>
            <div class="stepsChangeIndicator changeIndicator" v-if="'steps' in genDiffToPrevious.diff">St</div>
            <div class="cfgChangeIndicator changeIndicator" v-if="'cfgScale' in genDiffToPrevious.diff!">Cf</div>
            <div class="sizeChangeIndicator changeIndicator" v-if="'size' in genDiffToPrevious.diff">Si</div>
            <div class="modelChangeIndicator changeIndicator" v-if="'Model' in genDiffToPrevious.diff">Mo</div>
            <div class="samplerChangeIndicator changeIndicator" v-if="'Sampler' in genDiffToPrevious.diff">Sa</div>
            <div class="otherChangeIndicator changeIndicator" v-if="hasOtherProps(genDiffToPrevious.diff)">Ot</div>
        </div>
        <div class="hoverOverlay">
            <small>
                <CaretRightOutlined /><strong>This file</strong> vs {{ genDiffToPrevious.otherFile }}
                <br /><br />
                <!-- fixed props -->
                <table>
                    <tr v-if="'prompt' in genDiffToPrevious.diff">
                        <td><span class="promptChangeIndicator">+ Prompt</span></td>
                        <td>{{ genDiffToPrevious.diff.prompt }} tokens changed</td>
                    </tr>
                    <tr v-if="'negativePrompt' in genDiffToPrevious.diff">
                        <td><span class="negpromptChangeIndicator">- Prompt</span></td>
                        <td>{{ genDiffToPrevious.diff.negativePrompt }} tokens changed</td>
                    </tr>
                    <tr v-if="'seed' in genDiffToPrevious.diff">
                        <td><span class="seedChangeIndicator">Seed</span></td>
                        <td><strong>{{ genDiffToPrevious.diff.seed[0] }}</strong> vs {{ genDiffToPrevious.diff.seed[1] }}</td>
                    </tr>
                    <tr v-if="'steps' in genDiffToPrevious.diff">
                        <td><span class="stepsChangeIndicator">Steps</span></td>
                        <td><strong>{{ genDiffToPrevious.diff.steps[0] }}</strong> vs {{ genDiffToPrevious.diff.steps[1] }}
                        </td>
                    </tr>                   
                    <tr v-if="'cfgScale' in genDiffToPrevious.diff">
                        <td><span class="cfgChangeIndicator">Cfg Scale</span></td>
                        <td><strong>{{ genDiffToPrevious.diff.cfgScale[0] }}</strong> vs {{
                            genDiffToPrevious.diff.cfgScale[1] }}</td>
                    </tr>
                    <tr v-if="'size' in genDiffToPrevious.diff">
                        <td><span class="sizeChangeIndicator">Size</span></td>
                        <td><strong>{{ genDiffToPrevious.diff.size[0] }}</strong> vs {{ genDiffToPrevious.diff.size[1] }}
                        </td>
                    </tr>
                    <tr v-if="'Model' in genDiffToPrevious.diff">
                        <td><span class="modelChangeIndicator">Model</span></td>
                        <td><strong>{{ genDiffToPrevious.diff.Model[0] }}</strong><br/> vs {{ genDiffToPrevious.diff.Model[1] }}
                        </td>
                    </tr>
                    <tr v-if="'Sampler' in genDiffToPrevious.diff">
                        <td><span class="samplerChangeIndicator">Sampler</span></td>
                        <td><strong>{{ genDiffToPrevious.diff.Sampler[0] }}</strong><br/> vs {{ genDiffToPrevious.diff.Sampler[1] }}
                        </td>
                    </tr>
                </table>
                <br />

                <!-- others -->
                <div v-if="hasOtherProps(genDiffToPrevious.diff)">
                    <span class="otherChangeIndicator">Other</span> props that changed:<br/><br/>
                    <ul><!-- eslint-disable vue/require-v-for-key -->
                        <li v-for="(_value, propertyName) in filterManualProps(genDiffToPrevious.diff)">{{ propertyName }}
                        </li>
                    </ul>
                </div>
            </small>
        </div>
        <div class="changeIndicatorsRight changeIndicators" v-if="!genDiffToNext.empty">
            <div class="promptChangeIndicator changeIndicator" v-if="'prompt' in genDiffToNext.diff">P+</div>
            <div class="negpromptChangeIndicator changeIndicator" v-if="'negativePrompt' in genDiffToNext.diff">P-</div>
            <div class="seedChangeIndicator changeIndicator" v-if="'seed' in genDiffToNext.diff">Se</div>
            <div class="stepsChangeIndicator changeIndicator" v-if="'steps' in genDiffToNext.diff">St</div>
            <div class="cfgChangeIndicator changeIndicator" v-if="'cfgScale' in genDiffToNext.diff">Cf</div>
            <div class="sizeChangeIndicator changeIndicator" v-if="'size' in genDiffToNext.diff">Si</div>
            <div class="modelChangeIndicator changeIndicator" v-if="'Model' in genDiffToNext.diff">Mo</div>
            <div class="samplerChangeIndicator changeIndicator" v-if="'Sampler' in genDiffToNext.diff">Sa</div>
            <div class="otherChangeIndicator changeIndicator" v-if="hasOtherProps(genDiffToNext.diff)">Ot</div>
        </div>
        <div class="hoverOverlay">
            <small>
                <CaretRightOutlined /><strong>This file</strong> vs {{ genDiffToNext.otherFile }}
                <br /><br />
                <!-- fixed props -->
                <table>
                    <tr v-if="'prompt' in genDiffToNext.diff">
                        <td><span class="promptChangeIndicator">+ Prompt</span></td>
                        <td>{{ genDiffToNext.diff.prompt }} tokens changed</td>
                    </tr>
                    <tr v-if="'negativePrompt' in genDiffToNext.diff">
                        <td><span class="negpromptChangeIndicator">- Prompt</span></td>
                        <td>{{ genDiffToNext.diff.negativePrompt }} tokens changed</td>
                    </tr>
                    <tr v-if="'seed' in genDiffToNext.diff">
                        <td><span class="seedChangeIndicator">Seed</span></td>
                        <td><strong>{{ genDiffToNext.diff.seed[0] }}</strong> vs {{ genDiffToNext.diff.seed[1] }}</td>
                    </tr>
                    <tr v-if="'steps' in genDiffToNext.diff">
                        <td><span class="stepsChangeIndicator">Steps</span></td>
                        <td><strong>{{ genDiffToNext.diff.steps[0] }}</strong> vs {{ genDiffToNext.diff.steps[1] }}</td>
                    </tr>                    
                    <tr v-if="'cfgScale' in genDiffToNext.diff">
                        <td><span class="cfgChangeIndicator">Cfg Scale</span></td>
                        <td><strong>{{ genDiffToNext.diff.cfgScale[0] }}</strong> vs {{ genDiffToNext.diff.cfgScale[1] }}
                        </td>
                    </tr>
                    <tr v-if="'size' in genDiffToNext.diff">
                        <td><span class="sizeChangeIndicator">Size</span></td>
                        <td><strong>{{ genDiffToNext.diff.size[0] }}</strong> vs {{ genDiffToNext.diff.size[1] }}</td>
                    </tr>
                    <tr v-if="'Model' in genDiffToNext.diff">
                        <td><span class="modelChangeIndicator">Model</span></td>
                        <td><strong>{{ genDiffToNext.diff.Model[0] }}</strong><br/> vs {{ genDiffToNext.diff.Model[1] }}</td>
                    </tr>
                    <tr v-if="'Sampler' in genDiffToNext.diff">
                        <td><span class="samplerChangeIndicator">Sampler</span></td>
                        <td><strong>{{ genDiffToNext.diff.Sampler[0] }}</strong><br/> vs {{ genDiffToNext.diff.Sampler[1] }}</td>
                    </tr>
                </table>
                <br />

                <!-- others -->
                <div v-if="hasOtherProps(genDiffToNext.diff)">
                    <span class="otherChangeIndicator">Other</span> props that changed:<br/><br/>
                    <ul>
                        <li v-for="(_value, propertyName) in filterManualProps(genDiffToNext.diff)">{{ propertyName }}
                        </li>
                    </ul>
                </div>
            </small>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.changeIndicators {
    position: absolute;
    display: flex;
    flex-direction: column;
    height: 100%;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
}

.changeIndicatorsRight {
    position: absolute;
    right: 0;
}

.changeIndicator {
    margin-left: -4px;
    width: 16px;
    height: 16px;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: gray;
    line-height: 16px;
    margin-bottom: 2px;
    text-align: center;
    font-size: 6pt;
    font-weight: 600;
    color: black;
    z-index: 9999;
    pointer-events: auto;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.changeIndicatorsRight .changeIndicator {
    margin-right: -4px;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    text-align: left;
    padding-left: 2px;
}

.changeIndicatorsLeft .changeIndicator {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    text-align: right;
    padding-right: 2px;
}

.changeIndicatorWrapper {
    top: 0;
    position: absolute;
    user-select: none;
    width: 100%;
    height: 100%;
    z-index: 999999;
    pointer-events: none;
}

.hoverOverlay {
    display: none;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    border: 1px solid gray;
    padding: 10px;
    padding-left: 20px;
    padding-right: 20px;
    border-radius: 5px;
    z-index: 100;
    opacity: 1;
    font-size: 8pt;
    line-height: 1.2;
    overflow: hidden;
}

.hoverOverlay ul {
    list-style: none;
    padding: 0;
}

.hoverOverlay ul li {
    display: inline-block;
    padding-left: 4px;
    padding-right: 4px;
    border: 1px solid gray;
    border-radius: 2px;
    margin: 1px;
    font-weight: 200;
}

.changeIndicators:hover {
    opacity: 1;
}

.changeIndicators:hover+div.hoverOverlay {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

table tr td:first-child span {
    padding: 1px;
    padding-left:3px;
    padding-right:3px;
    display: inline-block;
    width: 100%;
}

table tr td:first-child {
    padding-right:10px;
    vertical-align: top;
}

.otherChangeIndicator {
    background-color: #8b5b8e;
    color: #efefef;
}

.stepsChangeIndicator {
    background-color: #577ab8;
    color: #efefef;
}

.seedChangeIndicator {
    background-color: #649da3;
    color: #112211;
}

.negpromptChangeIndicator {
    background-color: #d8a390;
    color: rgb(47, 47, 47);
}

.modelChangeIndicator {
    background-color: #d68679;
    color: #efefef;
}

.promptChangeIndicator {
    background-color: #8fba99;
    color: #112211;
}

.cfgChangeIndicator {
    background-color: #d4c98f;
    color: #112211;
}

.sizeChangeIndicator {
    background-color: #678a6c;
    color: #efefef;
}</style>