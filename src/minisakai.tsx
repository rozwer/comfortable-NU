import React from "react";
import { createRoot } from "react-dom/client";
import { MiniSakaiRoot } from "./components/main";
import { Settings } from "./features/setting/types";

/**
 * Toggle state for miniSakai
 */
let toggle = false;

/**
 * Change visibility of miniSakai.
 */
export const toggleMiniSakai = (): void => {
    if (toggle) {
        // Hide miniSakai
        miniSakai.classList.remove("cs-show");
        miniSakai.classList.add("cs-hide");
        document.getElementById("cs-cover")?.remove();
    } else {
        // Display miniSakai
        miniSakai.classList.remove("cs-hide");
        miniSakai.classList.add("cs-show");
        const cover = document.createElement("div");
        cover.id = "cs-cover";
        document.getElementsByTagName("body")[0].appendChild(cover);
        cover.onclick = toggleMiniSakai;
    }
    toggle = !toggle;
};

export const miniSakai = document.createElement("div");
miniSakai.id = "miniSakai";
miniSakai.classList.add("cs-minisakai", "cs-tab");

export const hamburger = document.createElement("button");
hamburger.className = "cs-loading";
hamburger.addEventListener("click", toggleMiniSakai);

// 時間割ボタンの作成
export const scheduleButton = document.createElement("button");
scheduleButton.className = "cs-header-btn cs-schedule-btn";
scheduleButton.innerHTML = `<img src="${chrome.runtime.getURL("img/scheduleBtn.svg")}" alt="schedule">`;
scheduleButton.addEventListener("click", () => {
    // 時間割タブを表示
    import("./features/tact/timetable").then(({ showTimetableModal }) => {
        showTimetableModal();
    });
});

// お気に入りボタンの作成
export const favoriteButton = document.createElement("button");
favoriteButton.className = "cs-header-btn cs-favorite-btn";
favoriteButton.innerHTML = `<img src="${chrome.runtime.getURL("img/favoriteBtn.svg")}" alt="sync">`;
favoriteButton.addEventListener("click", () => {
    // Googleカレンダー同期モーダルを表示
    import("./calendarSync").then(({ showSyncModal }) => {
        showSyncModal();
    });
});

/**
 * Add a button to open miniSakai.
 */
export function addMiniSakaiBtn(): void {
    const topbar = document.getElementById("mastLogin");
    try {
        // お気に入りボタンを追加
        topbar?.appendChild(favoriteButton);
        // 時間割ボタンを追加
        topbar?.appendChild(scheduleButton);
        // 既存のハンバーガーボタンを追加
        topbar?.appendChild(hamburger);
    } catch (e) {
        console.log("could not launch miniSakai.");
    }
}

/**
 * Insert miniSakai into Sakai LMS.
 * @param hostname - A PRIMARY key for storage. Usually a hostname of Sakai LMS.
 */
export function createMiniSakai(hostname: string) {
    const parent = document.getElementsByClassName("Mrphs-mainHeader")[0];
    const ref = document.getElementsByClassName("Mrphs-sites-nav")[0];
    parent?.insertBefore(miniSakai, ref);
    const root = createRoot(miniSakai);
    root.render(<MiniSakaiRoot subset={false} hostname={hostname} />);
}

/**
 * Sets color theme to CSS custom property.
 * @param settings - Settings for miniSakai.
 * @param isSubSakai - SubSakai or not.
 */
export const applyColorSettings = (settings: Settings, isSubSakai: boolean): void => {
    let bodyStyles: HTMLElement;
    if (!isSubSakai) {
        bodyStyles = document.querySelector(".Mrphs-mainHeader") as HTMLElement;
    } else {
        bodyStyles = document.querySelector("#subSakai") as HTMLElement;
    }
    for (const colorName of Object.getOwnPropertyNames(settings.color)) {
        // @ts-ignore
        const color = settings.color[colorName];
        bodyStyles.style.setProperty(`--${colorName}`, color);
    }
    bodyStyles.style.setProperty("--textColor", settings.getTextColor());
    bodyStyles.style.setProperty("--bgColor", settings.getBgColor());
    bodyStyles.style.setProperty("--dateColor", settings.getDateColor());
};
