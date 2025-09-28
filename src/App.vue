<script setup lang="ts">
import { computed, onMounted, ref, watch, type Ref } from "vue";
import nameBgSrc from "../assets/name_bg.png";
import AssetPicker from "./components/AssetPicker.vue";
import TitlePicker from "./components/TitlePicker.vue";
import {
    dansCatalog,
    fanBattleClassCatalog,
    frameCatalog,
    iconCatalog,
    nameplateCatalog,
    titleCatalog,
    type AssetItem,
    type TitleEntry,
} from "./lib/assetsCatalog";
import {
    loadFavorites,
    loadSelection,
    saveFavorites,
    saveSelection,
    type FavoritesState,
    type SelectionState,
} from "./lib/storage";

const ratingDigitModules = import.meta.glob(
    "../assets/rating_num/UI_NUM_Drating_*.png",
    { eager: true, import: "default" }
) as Record<string, string>;

const ratingDigitUrlMap = new Map<string, string>();
for (const [path, url] of Object.entries(ratingDigitModules)) {
    const match = path.match(/_(\d)\.png$/);
    if (match?.[1]) {
        ratingDigitUrlMap.set(match[1], url);
    }
}

const ratingBgModules = import.meta.glob(
    "../assets/rating_bg/UI_CMN_DXRating_*.png",
    { eager: true, import: "default" }
) as Record<string, string>;

const ratingBgUrlMap = new Map<string, string>();
for (const [path, url] of Object.entries(ratingBgModules)) {
    const match = path.match(/UI_CMN_DXRating_(\d{2})\.png$/);
    if (match?.[1]) {
        ratingBgUrlMap.set(match[1], url);
    }
}

const getImgCodeFromDxRating = (dxRating: number): string => {
    const ranges: [number, number, string][] = [
        [0, 999, "01"],
        [1000, 1999, "02"],
        [2000, 3999, "03"],
        [4000, 6999, "04"],
        [7000, 9999, "05"],
        [10000, 11999, "06"],
        [12000, 12999, "07"],
        [13000, 13999, "08"],
        [14000, 14499, "09"],
        [14500, 14999, "10"],
    ];

    for (const [lower, upper, code] of ranges) {
        if (lower <= dxRating && dxRating <= upper) {
            return code;
        }
    }
    return "11";
};

const titleBgModules = import.meta.glob(
    "../assets/title/UI_CMN_Shougou_*.png",
    { eager: true, import: "default" }
) as Record<string, string>;

const titleBgUrlMap = new Map<string, string>();
for (const [path, url] of Object.entries(titleBgModules)) {
    const match = path.match(/UI_CMN_Shougou_(.+)\.png$/);
    if (match?.[1]) {
        titleBgUrlMap.set(match[1], url);
    }
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
    if (!src) {
        return Promise.reject(new Error("缺少图片资源地址"));
    }
    if (!imageCache.has(src)) {
        const promise = new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`加载图片失败: ${src}`));
            img.src = src;
        });
        imageCache.set(src, promise);
    }
    return imageCache.get(src)!;
}

const CANVAS_WIDTH = 976;
const CANVAS_HEIGHT = 596;
const PLATE_WIDTH = 600;
const PLATE_MARGIN_TOP = 30;
const PLATE_MARGIN_RIGHT = 70;
const PLATE_RIGHT_PADDING = 5;
const ICON_PADDING = 5;
const RATING_HEIGHT = 28;
const RATING_GAP = 2;
const FAN_BATTLE_GAP = 8;
const FAN_BATTLE_SCALE = 1.2;
const SECTION_GAP = 2;
const NAME_BG_HEIGHT = 32;
const NAME_BG_TEXT_LEFT = 2;
const NAME_BG_TEXT_RIGHT_GAP = 0;
const DANS_RIGHT_PADDING = 2;
const DANS_TARGET_HEIGHT = 32;
const TITLE_BG_HEIGHT = 26;
const TITLE_TEXT_PADDING = 10;
const NAME_TEXT_MAX_FONT = 20;
const NAME_TEXT_MIN_FONT = 12;
const NAME_TEXT_FULLWIDTH_COUNT = 8;
const TITLE_TEXT_MAX_FONT = 14;
const TITLE_TEXT_MIN_FONT = 10;
const FONT_FAMILY =
    '"Noto Sans JP", "Microsoft YaHei", "PingFang SC", sans-serif';
const DEFAULT_TITLE_RARE_TYPE = "Normal";

type FrameAlignment = "left" | "center" | "right";

const frameAlignmentOptions: Array<{
    value: FrameAlignment;
    label: string;
}> = [
    { value: "left", label: "靠左" },
    { value: "center", label: "居中" },
    { value: "right", label: "靠右" },
];

function isValidFrameAlignment(value: unknown): value is FrameAlignment {
    return value === "left" || value === "center" || value === "right";
}

function resolveTitleBackground(rareType: string): string {
    return (
        titleBgUrlMap.get(rareType) ??
        titleBgUrlMap.get(DEFAULT_TITLE_RARE_TYPE) ??
        Array.from(titleBgUrlMap.values())[0] ??
        ""
    );
}

function toFullWidth(source: string): string {
    return source.replace(/[!-~]/g, (char) => {
        if (char === " ") return "\u3000";
        return String.fromCharCode(char.charCodeAt(0) - 0x20 + 0xff00);
    });
}

function resolveFontSize(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxFontSize: number,
    minFontSize: number,
    fontFamily: string
): number {
    if (maxWidth <= 0) {
        return minFontSize;
    }
    for (let size = maxFontSize; size >= minFontSize; size -= 1) {
        ctx.font = `${size}px ${fontFamily}`;
        if (ctx.measureText(text).width <= maxWidth) {
            return size;
        }
    }
    return minFontSize;
}

function fillTextWithStroke(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: {
        fillStyle?: CanvasRenderingContext2D["fillStyle"];
        strokeStyle?: CanvasRenderingContext2D["strokeStyle"];
        lineWidth?: number;
        shadowColor?: string;
        shadowBlur?: number;
        textAlign?: CanvasRenderingContext2D["textAlign"];
        textBaseline?: CanvasRenderingContext2D["textBaseline"];
    } = {}
) {
    const {
        fillStyle = "#ffffff",
        strokeStyle = "#000000",
        lineWidth = 3,
        shadowColor,
        shadowBlur,
        textAlign,
        textBaseline,
    } = options;

    ctx.save();
    if (textAlign) ctx.textAlign = textAlign;
    if (textBaseline) ctx.textBaseline = textBaseline;
    if (shadowColor) ctx.shadowColor = shadowColor;
    if (typeof shadowBlur === "number") ctx.shadowBlur = shadowBlur;
    ctx.lineJoin = "round";
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
}

function getDigitUrl(digit: string): string {
    const url = ratingDigitUrlMap.get(digit);
    if (!url) {
        throw new Error(`未找到 rating 数字图片资源: ${digit}`);
    }
    return url;
}

function loadDigitImage(digit: string) {
    return loadImage(getDigitUrl(digit));
}

function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error("生成图片数据失败"));
            }
        }, "image/png");
    });
}

function buildSafeFileName(raw: string): string {
    const normalized = raw
        .normalize("NFKC")
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/^-+|-+$/g, "");
    return normalized || "maimai-card";
}

const frameId = ref(frameCatalog.items[0]?.id ?? "");
const nameplateId = ref(nameplateCatalog.items[0]?.id ?? "");
const iconId = ref(iconCatalog.items[0]?.id ?? "");
const fanBattleClassId = ref(fanBattleClassCatalog.items[0]?.id ?? "");
const dansId = ref(dansCatalog.items[0]?.id ?? "");
const frameAlignment = ref<FrameAlignment>("center");

const defaultTitle = titleCatalog.entries[0];
const titleKey = ref(defaultTitle ? titleCatalog.makeKey(defaultTitle) : "");

const username = ref("");

const ratingRaw = ref("");
const ratingInput = computed({
    get: () => ratingRaw.value,
    set: (value: string) => {
        ratingRaw.value = value.replace(/[^0-9]/g, "").slice(0, 5);
    },
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDownloading = ref(false);
const downloadError = ref<string | null>(null);

const isHydrating = ref(true);

const favoriteFrames = ref<string[]>([]);
const favoriteNameplates = ref<string[]>([]);
const favoriteIcons = ref<string[]>([]);
const favoriteTitles = ref<string[]>([]);

function normalizeIds(
    source: string[],
    isValid: (id: string) => boolean
): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of source) {
        if (!id || seen.has(id) || !isValid(id)) continue;
        seen.add(id);
        result.push(id);
    }
    return result;
}

function tryRestoreSelection(stored: SelectionState) {
    if (stored.frameId && frameCatalog.byId(stored.frameId)) {
        frameId.value = stored.frameId;
    }
    if (stored.nameplateId && nameplateCatalog.byId(stored.nameplateId)) {
        nameplateId.value = stored.nameplateId;
    }
    if (stored.iconId && iconCatalog.byId(stored.iconId)) {
        iconId.value = stored.iconId;
    }
    if (
        stored.fanBattleClassId &&
        fanBattleClassCatalog.byId(stored.fanBattleClassId)
    ) {
        fanBattleClassId.value = stored.fanBattleClassId;
    }
    if (stored.dansId && dansCatalog.byId(stored.dansId)) {
        dansId.value = stored.dansId;
    }
    if (stored.titleKey && titleCatalog.findByKey(stored.titleKey)) {
        titleKey.value = stored.titleKey;
    }
    if (stored.rating) {
        ratingRaw.value = stored.rating.replace(/[^0-9]/g, "").slice(0, 5);
    }
    if (stored.username) {
        username.value = stored.username;
    }
    if (stored.frameAlignment && isValidFrameAlignment(stored.frameAlignment)) {
        frameAlignment.value = stored.frameAlignment;
    }
}

function collectSelection(): SelectionState {
    return {
        frameId: frameId.value || undefined,
        nameplateId: nameplateId.value || undefined,
        iconId: iconId.value || undefined,
        fanBattleClassId: fanBattleClassId.value || undefined,
        dansId: dansId.value || undefined,
        titleKey: titleKey.value || undefined,
        rating: ratingRaw.value || undefined,
        username: username.value || undefined,
        frameAlignment: frameAlignment.value,
    };
}

function toggleListItem(target: Ref<string[]>, id: string) {
    if (!id) return;
    const list = target.value;
    if (list.includes(id)) {
        target.value = list.filter((item) => item !== id);
    } else {
        target.value = [id, ...list];
    }
}

function onToggleFrameFavorite(id: string) {
    toggleListItem(favoriteFrames, id);
}

function onToggleNameplateFavorite(id: string) {
    toggleListItem(favoriteNameplates, id);
}

function onToggleIconFavorite(id: string) {
    toggleListItem(favoriteIcons, id);
}

function onToggleTitleFavorite(key: string) {
    toggleListItem(favoriteTitles, key);
}

onMounted(() => {
    const favorites = loadFavorites();
    favoriteFrames.value = normalizeIds(
        favorites.frames,
        (id) => !!frameCatalog.byId(id)
    );
    favoriteNameplates.value = normalizeIds(
        favorites.nameplates,
        (id) => !!nameplateCatalog.byId(id)
    );
    favoriteIcons.value = normalizeIds(
        favorites.icons,
        (id) => !!iconCatalog.byId(id)
    );
    favoriteTitles.value = normalizeIds(
        favorites.titles,
        (key) => !!titleCatalog.findByKey(key)
    );

    const storedSelection = loadSelection();
    if (storedSelection) {
        tryRestoreSelection(storedSelection);
    }

    isHydrating.value = false;
    void renderCanvas();
});

watch(
    [
        frameId,
        nameplateId,
        iconId,
        fanBattleClassId,
        dansId,
        titleKey,
        ratingRaw,
        username,
        frameAlignment,
    ],
    () => {
        if (isHydrating.value) return;
        saveSelection(collectSelection());
    },
    { flush: "post" }
);

watch(
    [favoriteFrames, favoriteNameplates, favoriteIcons, favoriteTitles],
    () => {
        if (isHydrating.value) return;
        const nextFavorites: FavoritesState = {
            frames: favoriteFrames.value,
            nameplates: favoriteNameplates.value,
            icons: favoriteIcons.value,
            titles: favoriteTitles.value,
        };
        saveFavorites(nextFavorites);
    },
    { flush: "post", deep: true }
);
const selectedFrame = computed<AssetItem | undefined>(() =>
    frameCatalog.byId(frameId.value)
);
const selectedNameplate = computed<AssetItem | undefined>(() =>
    nameplateCatalog.byId(nameplateId.value)
);
const selectedIcon = computed<AssetItem | undefined>(() =>
    iconCatalog.byId(iconId.value)
);
const selectedFanBattleClass = computed<AssetItem | undefined>(() =>
    fanBattleClassCatalog.byId(fanBattleClassId.value)
);
const selectedDans = computed<AssetItem | undefined>(() =>
    dansCatalog.byId(dansId.value)
);

const selectedTitle = computed<TitleEntry | undefined>(() =>
    titleCatalog.findByKey(titleKey.value)
);

const hasPreviewReady = computed(
    () =>
        !!(
            selectedFrame.value &&
            selectedNameplate.value &&
            selectedIcon.value &&
            ratingRaw.value &&
            selectedFanBattleClass.value &&
            selectedDans.value &&
            selectedTitle.value &&
            username.value.trim()
        )
);

const fanBattleClassItems = fanBattleClassCatalog.items;
const dansItems = dansCatalog.items;

function selectFanBattleClass(id: string) {
    fanBattleClassId.value = id;
}

function selectDans(id: string) {
    dansId.value = id;
}

let renderJobId = 0;

async function renderCanvas() {
    const jobId = ++renderJobId;
    const canvas = canvasRef.value;
    if (!canvas) return;

    if (canvas.width !== CANVAS_WIDTH) {
        canvas.width = CANVAS_WIDTH;
    }
    if (canvas.height !== CANVAS_HEIGHT) {
        canvas.height = CANVAS_HEIGHT;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const frame = selectedFrame.value;
    const nameplate = selectedNameplate.value;
    const icon = selectedIcon.value;
    const fanBattle = selectedFanBattleClass.value;
    const dans = selectedDans.value;
    const title = selectedTitle.value;
    const ratingValue = ratingRaw.value.trim();
    const usernameValue = username.value.trim();

    if (
        !frame ||
        !nameplate ||
        !icon ||
        !fanBattle ||
        !dans ||
        !title ||
        !ratingValue ||
        !usernameValue
    ) {
        return;
    }

    try {
        const titleBgSrcResolved = resolveTitleBackground(title.rareType);
        const ratingNumericValue = Number(ratingValue);
        const ratingBgCode = getImgCodeFromDxRating(
            Number.isFinite(ratingNumericValue) ? ratingNumericValue : 0
        );
        const ratingBgUrl =
            ratingBgUrlMap.get(ratingBgCode) ??
            ratingBgUrlMap.get("11") ??
            Array.from(ratingBgUrlMap.values())[0];
        if (!ratingBgUrl) {
            throw new Error("未找到 rating 背景图片资源");
        }

        const [
            frameImg,
            nameplateImg,
            iconImg,
            ratingBgImg,
            fanBattleImg,
            dansImg,
            nameBgImg,
            titleBgImg,
        ] = await Promise.all([
            loadImage(frame.url),
            loadImage(nameplate.url),
            loadImage(icon.url),
            loadImage(ratingBgUrl),
            loadImage(fanBattle.url),
            loadImage(dans.url),
            loadImage(nameBgSrc),
            loadImage(titleBgSrcResolved),
        ]);

        const ratingDigits = ratingValue.slice(-5).split("");
        const paddedDigits = Array.from({ length: 5 }, (_, index) => {
            const offset = 5 - ratingDigits.length;
            return index >= offset ? ratingDigits[index - offset] : null;
        });

        const digitImages = await Promise.all(
            paddedDigits.map((digit) => (digit ? loadDigitImage(digit) : null))
        );

        if (jobId !== renderJobId) return;

        const frameScale = Math.max(
            CANVAS_WIDTH / Math.max(frameImg.width, 1),
            CANVAS_HEIGHT / Math.max(frameImg.height, 1)
        );
        const frameDrawWidth = frameImg.width * frameScale;
        const frameDrawHeight = frameImg.height * frameScale;
        let frameDx: number;
        switch (frameAlignment.value) {
            case "left":
                frameDx = 0;
                break;
            case "right":
                frameDx = CANVAS_WIDTH - frameDrawWidth;
                break;
            default:
                frameDx = (CANVAS_WIDTH - frameDrawWidth) / 2;
                break;
        }
        const frameDy = (CANVAS_HEIGHT - frameDrawHeight) / 2;
        ctx.drawImage(
            frameImg,
            frameDx,
            frameDy,
            frameDrawWidth,
            frameDrawHeight
        );

        const plateScale = PLATE_WIDTH / Math.max(nameplateImg.width, 1);
        const plateHeight = nameplateImg.height * plateScale;
        const plateX = CANVAS_WIDTH - PLATE_MARGIN_RIGHT - PLATE_WIDTH;
        const plateY = PLATE_MARGIN_TOP;
        ctx.drawImage(nameplateImg, plateX, plateY, PLATE_WIDTH, plateHeight);

        const iconAvailableHeight = Math.max(plateHeight - ICON_PADDING * 2, 1);
        const iconScale = iconAvailableHeight / Math.max(iconImg.height, 1);
        const iconWidth = iconImg.width * iconScale;
        const iconHeight = iconImg.height * iconScale;
        const iconX = plateX + ICON_PADDING;
        const iconY = plateY + ICON_PADDING;
        ctx.drawImage(iconImg, iconX, iconY, iconWidth, iconHeight);

        const ratingX = iconX + iconWidth + RATING_GAP;
        const ratingY = plateY + ICON_PADDING;
        let ratingHeight = RATING_HEIGHT;
        let ratingScale = ratingHeight / Math.max(ratingBgImg.height, 1);
        let ratingWidth = ratingBgImg.width * ratingScale;
        const ratingMaxWidth =
            plateX + PLATE_WIDTH - PLATE_RIGHT_PADDING - ratingX;
        if (ratingWidth > ratingMaxWidth) {
            ratingScale = ratingMaxWidth / Math.max(ratingBgImg.width, 1);
            ratingWidth = ratingMaxWidth;
            ratingHeight = ratingBgImg.height * ratingScale;
        }

        ctx.drawImage(ratingBgImg, ratingX, ratingY, ratingWidth, ratingHeight);

        const digitAreaX = ratingX + 310 * ratingScale;
        const digitAreaY = ratingY + 20 * ratingScale;
        const digitAreaWidth = (578 - 310) * ratingScale;
        const digitAreaHeight = (ratingBgImg.height - 40) * ratingScale;
        const digitCellWidth = digitAreaWidth / 5;

        digitImages.forEach((digitImg, index) => {
            if (!digitImg) return;
            const cellX = digitAreaX + digitCellWidth * index;
            const scale = Math.min(
                (digitCellWidth * 0.9) / Math.max(digitImg.width, 1),
                (digitAreaHeight * 0.9) / Math.max(digitImg.height, 1)
            );
            const drawWidth = digitImg.width * scale;
            const drawHeight = digitImg.height * scale;
            const dx = cellX + (digitCellWidth - drawWidth) / 2;
            const dy = digitAreaY + (digitAreaHeight - drawHeight) / 2;
            ctx.drawImage(digitImg, dx, dy, drawWidth, drawHeight);
        });

        const fanBattleX = ratingX + ratingWidth + FAN_BATTLE_GAP;
        const fanBattleY = ratingY;
        let fanBattleHeight = ratingHeight * FAN_BATTLE_SCALE;
        let fanBattleScale = fanBattleHeight / Math.max(fanBattleImg.height, 1);
        let fanBattleWidth = fanBattleImg.width * fanBattleScale;
        const fanBattleMaxWidth =
            plateX + PLATE_WIDTH - PLATE_RIGHT_PADDING - fanBattleX;
        if (fanBattleWidth > fanBattleMaxWidth) {
            fanBattleScale =
                fanBattleMaxWidth / Math.max(fanBattleImg.width, 1);
            fanBattleWidth = fanBattleMaxWidth;
            fanBattleHeight = fanBattleImg.height * fanBattleScale;
        }
        if (fanBattleHeight > ratingHeight) {
            fanBattleHeight = ratingHeight;
            fanBattleScale = fanBattleHeight / Math.max(fanBattleImg.height, 1);
            fanBattleWidth = fanBattleImg.width * fanBattleScale;
        }
        const fanBattleDrawY =
            fanBattleY + (ratingHeight - fanBattleHeight) / 2;
        ctx.drawImage(
            fanBattleImg,
            fanBattleX,
            fanBattleDrawY,
            fanBattleWidth,
            fanBattleHeight
        );

        const nameBgX = ratingX;
        const nameBgY = ratingY + ratingHeight + SECTION_GAP;
        let nameBgScale = NAME_BG_HEIGHT / Math.max(nameBgImg.height, 1);
        let nameBgWidth = nameBgImg.width * nameBgScale;
        const nameBgMaxWidth =
            plateX + PLATE_WIDTH - PLATE_RIGHT_PADDING - nameBgX;
        if (nameBgWidth > nameBgMaxWidth) {
            nameBgScale = nameBgMaxWidth / Math.max(nameBgImg.width, 1);
            nameBgWidth = nameBgMaxWidth;
        }
        const nameBgHeight = nameBgImg.height * nameBgScale;
        ctx.drawImage(nameBgImg, nameBgX, nameBgY, nameBgWidth, nameBgHeight);

        const displayName = toFullWidth(usernameValue);
        ctx.save();
        ctx.font = `${NAME_TEXT_MAX_FONT}px ${FONT_FAMILY}`;
        const requiredNameTextWidth = ctx.measureText(
            "Ｗ".repeat(NAME_TEXT_FULLWIDTH_COUNT)
        ).width;
        ctx.restore();

        const availableDansWidth = Math.max(
            nameBgWidth -
                NAME_BG_TEXT_LEFT -
                NAME_BG_TEXT_RIGHT_GAP -
                DANS_RIGHT_PADDING -
                requiredNameTextWidth,
            0
        );

        let dansScale = DANS_TARGET_HEIGHT / Math.max(dansImg.height, 1);
        let dansWidth = dansImg.width * dansScale;
        if (dansWidth > availableDansWidth) {
            if (availableDansWidth > 0) {
                dansScale = availableDansWidth / Math.max(dansImg.width, 1);
                dansWidth = availableDansWidth;
            } else {
                dansWidth = 0;
            }
        }
        const dansHeight = dansImg.height * dansScale;
        const dansX = nameBgX + nameBgWidth - DANS_RIGHT_PADDING - dansWidth;
        const dansY = nameBgY + (nameBgHeight - dansHeight) / 2;
        if (dansWidth > 0 && dansHeight > 0) {
            ctx.drawImage(dansImg, dansX, dansY, dansWidth, dansHeight);
        }

        const textX = nameBgX + NAME_BG_TEXT_LEFT;
        const textRight =
            nameBgX +
            nameBgWidth -
            DANS_RIGHT_PADDING -
            NAME_BG_TEXT_RIGHT_GAP -
            Math.max(dansWidth, 0);
        const nameTextMaxWidth = Math.max(
            textRight - textX,
            requiredNameTextWidth
        );
        const nameFontSize = resolveFontSize(
            ctx,
            displayName,
            nameTextMaxWidth,
            NAME_TEXT_MAX_FONT,
            NAME_TEXT_MIN_FONT,
            FONT_FAMILY
        );

        ctx.save();
        ctx.font = `${nameFontSize}px ${FONT_FAMILY}`;
        ctx.fillStyle = "#0f172a";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
        ctx.shadowBlur = 4;
        ctx.fillText(displayName, textX, nameBgY + nameBgHeight / 2);
        ctx.restore();

        const titleBgX = ratingX;
        const titleBgY = nameBgY + nameBgHeight + SECTION_GAP;
        let titleBgScale = TITLE_BG_HEIGHT / Math.max(titleBgImg.height, 1);
        let titleBgWidth = titleBgImg.width * titleBgScale;
        const titleBgMaxWidth =
            plateX + PLATE_WIDTH - PLATE_RIGHT_PADDING - titleBgX;
        if (titleBgWidth > titleBgMaxWidth) {
            titleBgScale = titleBgMaxWidth / Math.max(titleBgImg.width, 1);
            titleBgWidth = titleBgMaxWidth;
        }
        const titleBgHeight = titleBgImg.height * titleBgScale;
        ctx.drawImage(
            titleBgImg,
            titleBgX,
            titleBgY,
            titleBgWidth,
            titleBgHeight
        );

        const titleTextMaxWidth = Math.max(
            titleBgWidth - TITLE_TEXT_PADDING * 2,
            0
        );
        const titleFontSize = resolveFontSize(
            ctx,
            title.name,
            titleTextMaxWidth,
            TITLE_TEXT_MAX_FONT,
            TITLE_TEXT_MIN_FONT,
            FONT_FAMILY
        );

        ctx.save();
        ctx.font = `${titleFontSize}px ${FONT_FAMILY}`;
        const titleCenterX = titleBgX + titleBgWidth / 2;
        const titleCenterY = titleBgY + titleBgHeight / 2;
        const measuredWidth = ctx.measureText(title.name).width;
        const titleDrawWidth = Math.min(measuredWidth, titleTextMaxWidth);
        const titleLeft = titleCenterX - titleDrawWidth / 2;
        const titleRight = titleCenterX + titleDrawWidth / 2;
        const titlePaddingOverflow = Math.max(
            0,
            Math.max(titleLeft - (titleBgX + TITLE_TEXT_PADDING), 0) +
                Math.max(
                    titleBgX + titleBgWidth - TITLE_TEXT_PADDING - titleRight,
                    0
                )
        );
        if (titlePaddingOverflow < 0) {
            ctx.translate(titlePaddingOverflow / 2, 0);
        }
        fillTextWithStroke(ctx, title.name, titleCenterX, titleCenterY, {
            fillStyle: "#ffffff",
            strokeStyle: "#0f172a",
            lineWidth: Math.max(titleFontSize * 0.2, 2),
            shadowColor: "rgba(15, 23, 42, 0.35)",
            shadowBlur: 4,
            textAlign: "center",
            textBaseline: "middle",
        });
        ctx.restore();
    } catch (error) {
        console.error("渲染画布时出现错误", error);
    }
}

watch(
    [
        frameId,
        nameplateId,
        iconId,
        fanBattleClassId,
        dansId,
        titleKey,
        ratingRaw,
        username,
    ],
    () => {
        downloadError.value = null;
        void renderCanvas();
    },
    { flush: "post" }
);

watch(
    () => hasPreviewReady.value,
    () => {
        void renderCanvas();
    },
    { flush: "post" }
);

watch(
    () => canvasRef.value,
    () => {
        void renderCanvas();
    }
);

async function downloadImage() {
    if (isDownloading.value || !hasPreviewReady.value) {
        return;
    }

    const canvas = canvasRef.value;
    if (!canvas) return;

    downloadError.value = null;

    try {
        isDownloading.value = true;
        await renderCanvas();
        const blob = await canvasToBlob(canvas);
        const url = URL.createObjectURL(blob);
        const baseName = buildSafeFileName(
            username.value.trim() || "maimai-card"
        );
        const ratingSuffix = ratingRaw.value ? `-${ratingRaw.value}` : "";
        const filename = `${baseName}${ratingSuffix}.png`;

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("导出图片失败", error);
        downloadError.value = "导出失败，请稍后重试";
    } finally {
        isDownloading.value = false;
    }
}
</script>

<template>
    <div class="app-shell">
        <header class="app-header">
            <div class="app-header__content">
                <h1>maimai DX 背屏生成器</h1>
                <p>
                    选择框体、plate、头像、段位等素材，输入 rating
                    与用户名，即可一键生成背景卡。 所有素材均来自本地
                    <code>assets</code> 目录。
                </p>
            </div>
        </header>

        <main class="app-main">
            <section class="control-panel">
                <AssetPicker
                    label="Frame 框体"
                    v-model="frameId"
                    :catalog="frameCatalog"
                    helper="输入或浏览 6 位 Frame ID"
                    :preview-size="112"
                    :favorites="favoriteFrames"
                    favorite-hint="收藏的素材将置顶显示，并保存在本地浏览器。"
                    @toggle-favorite="onToggleFrameFavorite"
                />

                <div class="form-field">
                    <label class="field-label">框体裁剪对齐</label>
                    <div class="segmented-control" role="radiogroup">
                        <button
                            v-for="option in frameAlignmentOptions"
                            :key="option.value"
                            class="segmented-control__button"
                            type="button"
                            :class="{
                                'segmented-control__button--active':
                                    frameAlignment === option.value,
                            }"
                            :aria-pressed="frameAlignment === option.value"
                            @click="frameAlignment = option.value"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                    <p class="field-helper">
                        选择框体缩放后保留的水平位置：左 / 中 / 右。
                    </p>
                </div>

                <AssetPicker
                    label="Nameplate 名牌"
                    v-model="nameplateId"
                    :catalog="nameplateCatalog"
                    helper="输入或浏览 6 位 Nameplate ID"
                    :preview-size="112"
                    :favorites="favoriteNameplates"
                    favorite-hint="收藏的素材将置顶显示，并保存在本地浏览器。"
                    @toggle-favorite="onToggleNameplateFavorite"
                />

                <AssetPicker
                    label="Icon 头像"
                    v-model="iconId"
                    :catalog="iconCatalog"
                    helper="输入或浏览 6 位 Icon ID"
                    :preview-size="96"
                    :favorites="favoriteIcons"
                    favorite-hint="收藏的素材将置顶显示，并保存在本地浏览器。"
                    @toggle-favorite="onToggleIconFavorite"
                />

                <div class="form-field">
                    <label class="field-label" for="rating-input"
                        >Rating 数值</label
                    >
                    <input
                        id="rating-input"
                        v-model="ratingInput"
                        class="field-input"
                        type="text"
                        inputmode="numeric"
                        maxlength="5"
                        placeholder="最多 5 位数字"
                    />
                    <p class="field-helper">
                        仅保留数字字符，超出部分会自动截断。
                    </p>
                </div>

                <div class="form-field">
                    <label class="field-label" for="username-input"
                        >用户名</label
                    >
                    <input
                        id="username-input"
                        v-model="username"
                        class="field-input"
                        type="text"
                        maxlength="20"
                        placeholder="输入要显示的用户名"
                    />
                    <p class="field-helper">
                        后续会自动转换半角字符为全角字符。
                    </p>
                </div>

                <div class="form-field">
                    <label class="field-label" for="frame-alignment"
                        >框体对齐</label
                    >
                    <select
                        id="frame-alignment"
                        v-model="frameAlignment"
                        class="field-input"
                    >
                        <option
                            v-for="option in frameAlignmentOptions"
                            :key="option.value"
                            :value="option.value"
                        >
                            {{ option.label }}
                        </option>
                    </select>
                    <p class="field-helper">选择框体在画布中的对齐方式。</p>
                </div>

                <div class="form-field">
                    <label class="field-label">Fan Battle Class</label>
                    <div class="inline-grid">
                        <button
                            v-for="item in fanBattleClassItems"
                            :key="item.id"
                            type="button"
                            class="inline-card"
                            :class="{
                                'inline-card--active':
                                    item.id === fanBattleClassId,
                            }"
                            @click="selectFanBattleClass(item.id)"
                        >
                            <img :src="item.url" :alt="item.filename" />
                            <span>{{ item.id }}</span>
                        </button>
                    </div>
                </div>

                <div class="form-field">
                    <label class="field-label">段位 Dans</label>
                    <div class="inline-grid">
                        <button
                            v-for="item in dansItems"
                            :key="item.id"
                            type="button"
                            class="inline-card"
                            :class="{
                                'inline-card--active': item.id === dansId,
                            }"
                            @click="selectDans(item.id)"
                        >
                            <img :src="item.url" :alt="item.filename" />
                            <span>{{ item.id }}</span>
                        </button>
                    </div>
                </div>
                <TitlePicker
                    label="称号"
                    v-model="titleKey"
                    :catalog="titleCatalog"
                    :favorites="favoriteTitles"
                    @toggle-favorite="onToggleTitleFavorite"
                />
            </section>

            <section class="preview-panel">
                <div class="preview-card">
                    <div class="preview-canvas-wrapper">
                        <canvas
                            ref="canvasRef"
                            width="976"
                            height="596"
                        ></canvas>
                        <div
                            v-if="!hasPreviewReady"
                            class="preview-placeholder"
                        >
                            <p>完成素材选择后将在此处实时预览合成效果。</p>
                        </div>
                    </div>
                </div>

                <div class="preview-summary">
                    <h2>当前配置</h2>
                    <dl>
                        <div>
                            <dt>Frame</dt>
                            <dd>{{ selectedFrame?.id ?? "未选择" }}</dd>
                        </div>
                        <div>
                            <dt>Nameplate</dt>
                            <dd>{{ selectedNameplate?.id ?? "未选择" }}</dd>
                        </div>
                        <div>
                            <dt>Icon</dt>
                            <dd>{{ selectedIcon?.id ?? "未选择" }}</dd>
                        </div>
                        <div>
                            <dt>Fan Battle Class</dt>
                            <dd>
                                {{ selectedFanBattleClass?.id ?? "未选择" }}
                            </dd>
                        </div>
                        <div>
                            <dt>段位</dt>
                            <dd>{{ selectedDans?.id ?? "未选择" }}</dd>
                        </div>
                        <div>
                            <dt>Rating</dt>
                            <dd>{{ ratingRaw || "未填写" }}</dd>
                        </div>
                        <div>
                            <dt>用户名</dt>
                            <dd>{{ username || "未填写" }}</dd>
                        </div>
                        <div>
                            <dt>称号</dt>
                            <dd>{{ selectedTitle?.name ?? "未选择" }}</dd>
                        </div>
                    </dl>
                </div>
            </section>
        </main>

        <footer class="app-footer">
            <button
                class="primary-button"
                type="button"
                :disabled="!hasPreviewReady || isDownloading"
                @click="downloadImage"
            >
                {{ isDownloading ? "导出中..." : "下载合成图片" }}
            </button>
            <p v-if="downloadError" class="footer-error">{{ downloadError }}</p>
            <p class="footer-hint">
                满足所有项目后可下载 PNG 文件，文件名会自动包含用户名与 rating。
            </p>
        </footer>
    </div>
</template>

<style scoped>
.app-shell {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    min-height: 100vh;
}

.app-header {
    display: flex;
    justify-content: center;
}

.app-header__content {
    width: min(1080px, 92vw);
    background: radial-gradient(
            circle at top left,
            rgba(59, 130, 246, 0.25),
            transparent 55%
        ),
        radial-gradient(
            circle at top right,
            rgba(236, 72, 153, 0.2),
            transparent 45%
        );
    padding: 2rem 2.5rem;
    border-radius: 24px;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(148, 163, 184, 0.25);
    box-shadow: 0 25px 55px -35px rgba(15, 23, 42, 0.55);
}

.app-header h1 {
    margin: 0 0 0.75rem;
    font-size: 2.2rem;
    color: #0f172a;
}

.app-header p {
    margin: 0;
    font-size: 1rem;
    color: #1f2937;
    line-height: 1.6;
}

.app-main {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
    gap: 2rem;
    width: min(1200px, 95vw);
    margin: 0 auto;
}

.control-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    padding: 0.9rem;
    box-shadow: 0 10px 30px -20px rgba(15, 23, 42, 0.25);
}

.field-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #475569;
}

.field-input {
    padding: 0.65rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    font-size: 0.95rem;
    font-family: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
    background: #f8fafc;
}

.field-input:focus {
    outline: none;
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
    background: #fff;
}

.field-helper {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
}

.inline-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 0.75rem;
    max-height: 240px;
    overflow-y: auto;
    padding-right: 0.25rem;
}

.inline-card {
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 12px;
    padding: 0.6rem 0.4rem;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.inline-card img {
    width: 72px;
    height: 36px;
    object-fit: contain;
}

.inline-card span {
    font-size: 0.75rem;
    color: #334155;
    font-weight: 600;
}

.inline-card:hover {
    transform: translateY(-1px);
    border-color: rgba(59, 130, 246, 0.65);
    box-shadow: 0 12px 24px -18px rgba(59, 130, 246, 0.5);
}

.inline-card--active {
    border-color: #3b82f6;
    box-shadow: 0 14px 28px -18px rgba(37, 99, 235, 0.6);
}

.preview-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.preview-card {
    background: #ffffff;
    border-radius: 24px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    padding: 1.5rem;
    box-shadow: 0 25px 55px -35px rgba(15, 23, 42, 0.55);
    display: flex;
    justify-content: center;
}

.preview-canvas-wrapper {
    position: relative;
    width: 100%;
    max-width: 976px;
    aspect-ratio: 976 / 596;
    border-radius: 18px;
    overflow: hidden;
    background: repeating-linear-gradient(
        135deg,
        #f8fafc,
        #f8fafc 16px,
        #e2e8f0 16px,
        #e2e8f0 32px
    );
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-canvas-wrapper canvas {
    width: 100%;
    height: 100%;
}

.preview-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 1.5rem;
    background: rgba(15, 23, 42, 0.35);
    color: #f8fafc;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.preview-summary {
    background: #ffffff;
    border-radius: 18px;
    border: 1px solid #e2e8f0;
    padding: 1.2rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 18px 45px -32px rgba(15, 23, 42, 0.5);
}

.preview-summary h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #1d4ed8;
}

.preview-summary dl {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem 1rem;
}

.preview-summary dt {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.preview-summary dd {
    margin: 0;
    font-size: 0.9rem;
    color: #1f2937;
    font-weight: 600;
}

.app-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 3rem;
}

.primary-button {
    padding: 0.75rem 2.5rem;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: #fff;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.primary-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.primary-button:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 45px -34px rgba(59, 130, 246, 0.75);
}

.segmented-control {
    display: inline-flex;
    gap: 0.4rem;
    background: #f1f5f9;
    padding: 0.35rem;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
}

.segmented-control__button {
    background: transparent;
    border: none;
    padding: 0.4rem 0.9rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #475569;
    border-radius: 999px;
    cursor: pointer;
    line-height: 1;
    letter-spacing: 0.03em;
    transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.segmented-control__button:hover {
    background: #e2e8f0;
}

.segmented-control__button--active {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: #fff;
    box-shadow: 0 4px 12px -4px rgba(59, 130, 246, 0.6);
}

.segmented-control__button--active:hover {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
}

.footer-hint {
    margin: 0;
    font-size: 0.85rem;
    color: #475569;
}

.footer-error {
    margin: 0;
    font-size: 0.85rem;
    color: #dc2626;
}

@media (max-width: 1040px) {
    .app-main {
        grid-template-columns: 1fr;
    }

    .preview-panel {
        order: -1;
    }
}

@media (max-width: 640px) {
    .app-header__content {
        padding: 1.5rem;
    }

    .app-header h1 {
        font-size: 1.75rem;
    }

    .preview-summary dl {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
}
</style>
