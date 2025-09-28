<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { TitleCatalog, TitleEntry } from "../lib/assetsCatalog";

import bgBronze from "../../assets/title/UI_CMN_Shougou_Bronze.png";
import bgGold from "../../assets/title/UI_CMN_Shougou_Gold.png";
import bgNormal from "../../assets/title/UI_CMN_Shougou_Normal.png";
import bgRainbow from "../../assets/title/UI_CMN_Shougou_Rainbow.png";
import bgSilver from "../../assets/title/UI_CMN_Shougou_Silver.png";

const props = defineProps<{
    label?: string;
    catalog: TitleCatalog;
    modelValue?: string;
    favorites?: string[];
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: string): void;
    (event: "toggle-favorite", value: string): void;
}>();

const isOpen = ref(false);
const searchTerm = ref("");
const visibleCount = ref(60);
const searchInputRef = ref<HTMLInputElement | null>(null);

const backgroundMap: Record<string, string> = {
    Normal: bgNormal,
    Bronze: bgBronze,
    Silver: bgSilver,
    Gold: bgGold,
    Rainbow: bgRainbow,
};

const selectedEntry = computed<TitleEntry | undefined>(() => {
    if (!props.modelValue) return undefined;
    return props.catalog.findByKey(props.modelValue);
});

const selectedBackground = computed(() => {
    if (!selectedEntry.value) return bgNormal;
    return backgroundMap[selectedEntry.value.rareType] ?? bgNormal;
});

const favoriteSet = computed(() => new Set(props.favorites ?? []));

const filteredEntries = computed(() => props.catalog.search(searchTerm.value));

const sortedEntries = computed(() => {
    const entries = filteredEntries.value.slice();
    return entries.sort((a, b) => {
        const aKey = props.catalog.makeKey(a);
        const bKey = props.catalog.makeKey(b);
        const aFav = favoriteSet.value.has(aKey);
        const bFav = favoriteSet.value.has(bKey);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return aKey.localeCompare(bKey, "ja");
    });
});

const displayedEntries = computed(() =>
    sortedEntries.value.slice(0, Math.max(visibleCount.value, 40))
);

const hasMore = computed(
    () => displayedEntries.value.length < filteredEntries.value.length
);

watch(isOpen, async (opened) => {
    if (opened) {
        searchTerm.value = "";
        visibleCount.value = 60;
        await nextTick();
        searchInputRef.value?.focus();
    }
});

function updateValue(value: string) {
    emit("update:modelValue", value);
}

function openModal() {
    isOpen.value = true;
}

function closeModal() {
    isOpen.value = false;
}

function choose(entry: TitleEntry) {
    updateValue(props.catalog.makeKey(entry));
    closeModal();
}

function loadMore() {
    visibleCount.value += 60;
}

function toggleFavorite(event: Event, entry: TitleEntry | undefined) {
    event.stopPropagation();
    if (!entry) return;
    emit("toggle-favorite", props.catalog.makeKey(entry));
}
</script>

<template>
    <div class="title-picker">
        <label v-if="label" class="picker-label">{{ label }}</label>
        <div class="picker-body">
            <div class="title-preview">
                <div class="title-preview__image">
                    <img :src="selectedBackground" alt="title background" />
                    <span v-if="selectedEntry" class="title-preview__text">{{
                        selectedEntry.name
                    }}</span>
                    <span v-else class="title-preview__placeholder"
                        >请选择称号</span
                    >
                </div>
                <button
                    v-if="selectedEntry"
                    type="button"
                    class="favorite-button"
                    :class="{
                        'favorite-button--active': favoriteSet.has(
                            modelValue ?? ''
                        ),
                    }"
                    @click="toggleFavorite($event, selectedEntry)"
                    :title="
                        favoriteSet.has(modelValue ?? '')
                            ? '取消收藏'
                            : '加入收藏'
                    "
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                        />
                    </svg>
                </button>
                <button type="button" class="picker-button" @click="openModal">
                    选择称号
                </button>
            </div>
            <p class="title-detail" v-if="selectedEntry">
                <span class="badge">{{ selectedEntry.rareType }}</span>
                <span>{{ selectedEntry.name }}</span>
            </p>
        </div>

        <Teleport to="body">
            <div
                v-if="isOpen"
                class="picker-overlay"
                @keydown.esc.prevent.stop="closeModal"
            >
                <div class="picker-modal" role="dialog" aria-modal="true">
                    <header class="picker-modal__header">
                        <h2>{{ label ?? "称号" }} 列表</h2>
                        <button
                            type="button"
                            class="picker-button"
                            @click="closeModal"
                        >
                            关闭
                        </button>
                    </header>
                    <div class="picker-modal__search">
                        <input
                            ref="searchInputRef"
                            v-model="searchTerm"
                            placeholder="搜索称号或稀有度"
                            class="picker-search-input"
                        />
                    </div>
                    <div class="title-grid">
                        <button
                            v-for="entry in displayedEntries"
                            :key="catalog.makeKey(entry)"
                            type="button"
                            class="title-grid-item"
                            :class="{
                                'title-grid-item--active':
                                    catalog.makeKey(entry) === modelValue,
                            }"
                            @click="choose(entry)"
                        >
                            <span
                                class="title-grid-favorite"
                                :class="{
                                    'title-grid-favorite--active':
                                        favoriteSet.has(catalog.makeKey(entry)),
                                }"
                                @click="toggleFavorite($event, entry)"
                                >★</span
                            >
                            <img
                                :src="backgroundMap[entry.rareType] ?? bgNormal"
                                :alt="entry.rareType"
                            />
                            <span class="title-grid-item__text">{{
                                entry.name
                            }}</span>
                            <span class="title-grid-item__tag">{{
                                entry.rareType
                            }}</span>
                        </button>
                    </div>
                    <div v-if="hasMore" class="picker-modal__footer">
                        <button
                            type="button"
                            class="picker-button"
                            @click="loadMore"
                        >
                            加载更多
                        </button>
                    </div>
                </div>
                <div class="picker-backdrop" @click="closeModal" />
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.title-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.picker-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #4b5563;
}

.picker-body {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    padding: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.title-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
}

.favorite-button {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: rgba(249, 115, 22, 0.12);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #f97316;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s,
        background 0.2s;
}

.favorite-button svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
}

.favorite-button:hover {
    transform: translateY(-1px);
    border-color: rgba(249, 115, 22, 0.5);
    box-shadow: 0 12px 22px -18px rgba(249, 115, 22, 0.6);
}

.favorite-button--active {
    background: linear-gradient(135deg, #fbbf24, #f97316);
    color: #fff;
    box-shadow: 0 14px 26px -18px rgba(251, 191, 36, 0.7);
}

.title-preview__image {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.6rem;
    border-radius: 999px;
    background: #f1f5f9;
    border: 1px dashed #cbd5f5;
    min-width: 220px;
}

.title-preview__image img {
    height: 40px;
    display: block;
}

.title-preview__text {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
}

.title-preview__placeholder {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.85rem;
    color: #64748b;
    white-space: nowrap;
}

.picker-button {
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
    border: none;
    background: linear-gradient(135deg, #ec4899, #6366f1);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.picker-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 20px -12px rgba(244, 114, 182, 0.6);
}

.picker-button:focus-visible {
    outline: 3px solid rgba(236, 72, 153, 0.35);
    outline-offset: 2px;
}

.title-detail {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 0;
    font-size: 0.85rem;
    color: #475569;
}

.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    background: rgba(99, 102, 241, 0.1);
    color: #4338ca;
    font-size: 0.75rem;
    font-weight: 600;
}

.picker-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 60;
}

.picker-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
}

.picker-modal {
    position: relative;
    background: #f8fafc;
    width: min(960px, 92vw);
    max-height: 88vh;
    border-radius: 18px;
    border: 1px solid rgba(236, 72, 153, 0.15);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 1;
    box-shadow: 0 24px 65px -28px rgba(236, 72, 153, 0.55);
}

.picker-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.picker-modal__header h2 {
    margin: 0;
    font-size: 1.1rem;
    color: #be185d;
}

.picker-modal__search {
    position: sticky;
    top: 0;
    z-index: 2;
}

.picker-search-input {
    width: 100%;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    border: 1px solid #fbcfe8;
    font-size: 0.95rem;
    background: #fff;
}

.title-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.75rem;
    overflow-y: auto;
    padding-right: 0.25rem;
}

.title-grid-item {
    border: 1px solid transparent;
    border-radius: 14px;
    background: #ffffff;
    padding: 0.9rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    cursor: pointer;
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    text-align: center;
    position: relative;
}

.title-grid-item img {
    width: 100%;
    height: 46px;
    object-fit: contain;
}

.title-grid-item__text {
    font-size: 0.85rem;
    color: #0f172a;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.title-grid-item__tag {
    font-size: 0.75rem;
    color: #ec4899;
    font-weight: 600;
}

.title-grid-favorite {
    position: absolute;
    top: 0.4rem;
    right: 0.5rem;
    font-size: 1.1rem;
    color: rgba(249, 115, 22, 0.5);
    transition: transform 0.2s, color 0.2s;
}

.title-grid-favorite:hover {
    color: #f97316;
    transform: scale(1.1);
}

.title-grid-favorite--active {
    color: #f97316;
    text-shadow: 0 6px 12px rgba(249, 115, 22, 0.35);
}

.title-grid-item:hover {
    border-color: rgba(236, 72, 153, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -18px rgba(236, 72, 153, 0.6);
}

.title-grid-item--active {
    border-color: #ec4899;
    box-shadow: 0 16px 30px -20px rgba(236, 72, 153, 0.7);
}

.picker-modal__footer {
    display: flex;
    justify-content: center;
}

@media (max-width: 768px) {
    .title-preview {
        flex-direction: column;
        align-items: stretch;
    }

    .title-preview__image {
        align-self: center;
    }
}
</style>
