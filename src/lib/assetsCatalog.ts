export interface AssetItem {
    id: string;
    filename: string;
    url: string;
}

export interface AssetCatalog {
    readonly items: AssetItem[];
    readonly size: number;
    byId(id: string): AssetItem | undefined;
    search(term: string): AssetItem[];
}

type Extractor = (filename: string) => string | undefined;

type CatalogOptions = {
    extractor: Extractor;
    sort?: (a: AssetItem, b: AssetItem) => number;
};

function createCatalog(
    modules: Record<string, string>,
    { extractor, sort }: CatalogOptions
): AssetCatalog {
    const items: AssetItem[] = Object.entries(modules)
        .map(([path, url]) => {
            const filename = path.split("/").pop() ?? path;
            const id = extractor(filename);
            if (!id) {
                throw new Error(`无法从文件名 "${filename}" 中提取 id`);
            }
            return { id, filename, url };
        })
        .sort(sort ?? ((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0)));

    const index = new Map(items.map((item) => [item.id, item]));

    const search = (term: string): AssetItem[] => {
        const normalized = term.trim().toLowerCase();
        if (!normalized) {
            return items;
        }
        return items.filter(
            (item) =>
                item.id.toLowerCase().includes(normalized) ||
                item.filename.toLowerCase().includes(normalized)
        );
    };

    return {
        get items() {
            return items;
        },
        get size() {
            return items.length;
        },
        byId: (id: string) => index.get(id),
        search,
    };
}

const frameModules = import.meta.glob("../../assets/frame/*.png", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const nameplateModules = import.meta.glob("../../assets/nameplate/*.png", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const iconModules = import.meta.glob("../../assets/icon/*.png", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const fanBattleClassModules = import.meta.glob(
    "../../assets/fan_battle_class/*.png",
    {
        eager: true,
        import: "default",
    }
) as Record<string, string>;

const dansModules = import.meta.glob("../../assets/dans/*.png", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const getSixDigitId: Extractor = (filename) => filename.match(/(\d{6})/)?.[1];
const getTwoDigitId: Extractor = (filename) => filename.match(/(\d{2})/)?.[1];

export const frameCatalog = createCatalog(frameModules, {
    extractor: getSixDigitId,
});

export const nameplateCatalog = createCatalog(nameplateModules, {
    extractor: getSixDigitId,
});

export const iconCatalog = createCatalog(iconModules, {
    extractor: getSixDigitId,
});

export const fanBattleClassCatalog = createCatalog(fanBattleClassModules, {
    extractor: getTwoDigitId,
    sort: (a, b) => Number(a.id) - Number(b.id),
});

export const dansCatalog = createCatalog(dansModules, {
    extractor: getTwoDigitId,
    sort: (a, b) => Number(a.id) - Number(b.id),
});

export type TitleEntry = {
    name: string;
    rareType: string;
};

export type TitleCatalog = {
    entries: TitleEntry[];
    search(term: string): TitleEntry[];
    makeKey(entry: TitleEntry): string;
    findByKey(key: string): TitleEntry | undefined;
};

import titlesDataRaw from "../../assets/title.json";

const titlesData = titlesDataRaw as TitleEntry[];

const makeTitleKey = (entry: TitleEntry): string =>
    `${entry.name}::${entry.rareType}`;

const titleIndex = new Map<string, TitleEntry>();
for (const entry of titlesData) {
    titleIndex.set(makeTitleKey(entry), entry);
}

export const titleCatalog = {
    entries: titlesData,
    search(term: string) {
        const normalized = term.trim().toLowerCase();
        if (!normalized) {
            return titlesData;
        }
        return titlesData.filter(
            (item) =>
                item.name.toLowerCase().includes(normalized) ||
                item.rareType.toLowerCase().includes(normalized)
        );
    },
    makeKey: makeTitleKey,
    findByKey(key: string) {
        return titleIndex.get(key);
    },
} satisfies TitleCatalog;
``;
