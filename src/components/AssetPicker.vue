<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { AssetCatalog, AssetItem } from "../lib/assetsCatalog";

const props = defineProps<{
    label: string;
    catalog: AssetCatalog;
    modelValue?: string;
    placeholder?: string;
    helper?: string;
    previewSize?: number;
    favorites?: string[];
    favoriteHint?: string;
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: string): void;
    (event: "toggle-favorite", value: string): void;
}>();

const isOpen = ref(false);
const searchTerm = ref("");
const visibleCount = ref(60);
const searchInputRef = ref<HTMLInputElement | null>(null);

const sanitizedValue = computed(() => props.modelValue ?? "");

const selectedItem = computed<AssetItem | undefined>(() => {
    if (!sanitizedValue.value) return undefined;
    return props.catalog.byId(sanitizedValue.value);
});

const isValid = computed(() => !sanitizedValue.value || !!selectedItem.value);

const favoriteIds = computed(() => new Set(props.favorites ?? []));

const filteredItems = computed(() => props.catalog.search(searchTerm.value));

const sortedItems = computed(() => {
    const items = filteredItems.value.slice();
    return items.sort((a, b) => {
        const aFav = favoriteIds.value.has(a.id);
        const bFav = favoriteIds.value.has(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.id.localeCompare(b.id);
    });
});

const displayedItems = computed(() =>
    sortedItems.value.slice(0, Math.max(visibleCount.value, 30))
);

const hasMore = computed(
    () => displayedItems.value.length < filteredItems.value.length
);

const previewSize = computed(() => props.previewSize ?? 96);

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

function onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    updateValue(target.value.trim());
}

function openModal() {
    isOpen.value = true;
}

function closeModal() {
    isOpen.value = false;
}

function choose(item: AssetItem) {
    updateValue(item.id);
    closeModal();
}

function loadMore() {
    visibleCount.value += 60;
}

function toggleFavorite(event: Event, itemId?: string) {
    event.stopPropagation();
    if (!itemId) return;
    emit("toggle-favorite", itemId);
}
</script>

<template>
    <div class="asset-picker">
        <label class="picker-label">{{ label }}</label>
        <div class="picker-body">
            <div class="picker-main">
                <div
                    class="picker-preview"
                    :style="{
                        width: `${previewSize}px`,
                        height: `${previewSize}px`,
                    }"
                >
                    <img
                        v-if="selectedItem"
                        :src="selectedItem.url"
                        :alt="selectedItem.filename"
                    />
                    <span v-else class="picker-preview__placeholder"
                        >无预览</span
                    >
                </div>
                <div class="picker-inputs">
                    <input
                        :value="sanitizedValue"
                        class="picker-input"
                        :placeholder="placeholder ?? '输入图片ID'"
                        @input="onInput"
                    />
                    <div class="picker-actions">
                        <button
                            v-if="selectedItem"
                            type="button"
                            class="picker-favorite"
                            :class="{
                                'picker-favorite--active': favoriteIds.has(
                                    selectedItem.id
                                ),
                            }"
                            @click="toggleFavorite($event, selectedItem.id)"
                            :title="
                                favoriteIds.has(selectedItem.id)
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
                        <button
                            type="button"
                            class="picker-button"
                            @click="openModal"
                        >
                            浏览列表
                        </button>
                    </div>
                    <p v-if="favoriteHint" class="picker-helper">
                        {{ favoriteHint }}
                    </p>
                    <p v-if="helper" class="picker-helper">{{ helper }}</p>
                    <p v-if="sanitizedValue && !isValid" class="picker-error">
                        未找到对应的图片 ID
                    </p>
                </div>
            </div>
        </div>

        <Teleport to="body">
            <div
                v-if="isOpen"
                class="picker-overlay"
                @keydown.esc.prevent.stop="closeModal"
            >
                <div class="picker-modal" role="dialog" aria-modal="true">
                    <header class="picker-modal__header">
                        <h2>{{ label }} 列表</h2>
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
                            placeholder="搜索ID或文件名"
                            class="picker-search-input"
                        />
                    </div>
                    <div class="picker-grid">
                        <button
                            v-for="item in displayedItems"
                            :key="item.id"
                            type="button"
                            class="picker-grid-item"
                            :class="{
                                'picker-grid-item--active':
                                    item.id === sanitizedValue,
                            }"
                            @click="choose(item)"
                        >
                            <span
                                class="picker-grid-favorite"
                                :class="{
                                    'picker-grid-favorite--active':
                                        favoriteIds.has(item.id),
                                }"
                                @click="toggleFavorite($event, item.id)"
                            >
                                ★
                            </span>
                            <img :src="item.url" :alt="item.filename" />
                            <span>{{ item.id }}</span>
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
.asset-picker {
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
    padding: 0.75rem;
    box-shadow: 0 10px 30px -18px rgba(15, 23, 42, 0.3);
}

.picker-main {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.picker-preview {
    flex-shrink: 0;
    border-radius: 10px;
    border: 1px dashed #d1d5db;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f9fafb;
    overflow: hidden;
}

.picker-preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.picker-preview__placeholder {
    font-size: 0.75rem;
    color: #94a3b8;
}

.picker-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
}

.picker-input {
    padding: 0.65rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    font-size: 0.95rem;
    font-family: inherit;
    color: #111827;
    background: #f9fafb;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.picker-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    background: #fff;
}

.picker-actions {
    display: flex;
    gap: 0.5rem;
}

.picker-favorite {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: rgba(251, 191, 36, 0.12);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s,
        background 0.2s;
    color: #d97706;
}

.picker-favorite svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
}

.picker-favorite:hover {
    transform: translateY(-1px);
    border-color: rgba(217, 119, 6, 0.5);
    box-shadow: 0 10px 18px -14px rgba(217, 119, 6, 0.6);
}

.picker-favorite--active {
    background: linear-gradient(135deg, #facc15, #f97316);
    color: #fff;
    box-shadow: 0 12px 22px -16px rgba(234, 179, 8, 0.7);
}

.picker-button {
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
    border: none;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.picker-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 20px -12px rgba(99, 102, 241, 0.7);
}

.picker-button:focus-visible {
    outline: 3px solid rgba(99, 102, 241, 0.45);
    outline-offset: 2px;
}

.picker-helper {
    margin: 0;
    font-size: 0.8rem;
    color: #6b7280;
}

.picker-error {
    margin: 0;
    font-size: 0.8rem;
    color: #dc2626;
}

.picker-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
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
    border: 1px solid rgba(99, 102, 241, 0.2);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 1;
    box-shadow: 0 20px 60px -25px rgba(79, 70, 229, 0.55);
}

.picker-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.picker-modal__header h2 {
    margin: 0;
    font-size: 1.1rem;
    color: #312e81;
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
    border: 1px solid #cbd5f5;
    font-size: 0.95rem;
    background: #fff;
}

.picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
    overflow-y: auto;
    padding-right: 0.25rem;
}

.picker-grid-item {
    border: 1px solid transparent;
    border-radius: 12px;
    background: #ffffff;
    padding: 0.75rem 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    position: relative;
}

.picker-grid-item img {
    width: 96px;
    height: 96px;
    object-fit: contain;
}

.picker-grid-item span {
    font-size: 0.85rem;
    color: #4c1d95;
    font-weight: 600;
}

.picker-grid-favorite {
    position: absolute;
    top: 0.35rem;
    right: 0.45rem;
    font-size: 1rem;
    color: rgba(217, 119, 6, 0.55);
    transition: transform 0.2s, color 0.2s;
}

.picker-grid-favorite:hover {
    color: #ea580c;
    transform: scale(1.1);
}

.picker-grid-favorite--active {
    color: #f97316;
    text-shadow: 0 6px 12px rgba(249, 115, 22, 0.35);
}

.picker-grid-item:hover {
    border-color: rgba(99, 102, 241, 0.55);
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -18px rgba(79, 70, 229, 0.6);
}

.picker-grid-item--active {
    border-color: #6366f1;
    box-shadow: 0 16px 30px -18px rgba(99, 102, 241, 0.7);
}

.picker-modal__footer {
    display: flex;
    justify-content: center;
}

@media (max-width: 768px) {
    .picker-main {
        flex-direction: column;
        align-items: stretch;
    }

    .picker-preview {
        align-self: center;
    }
}
</style>
