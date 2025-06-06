/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 未公開課題を非表示にする設定オプションを追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
import React from "react";
import { useTranslation, useTranslationArgsDeps, useTranslationDeps } from "./helper";
import { Settings } from "../features/setting/types";

export type SettingsChange =
    | {
          type: "number";
          id: string;
          newValue: number;
      }
    | {
          type: "string";
          id: string;
          newValue: string;
      }
    | {
          type: "boolean";
          id: string;
          newValue: boolean;
      }
    | {
          type: "reset-color";
      };

export function SettingsTab(props: { onSettingsChange: (change: SettingsChange) => void; settings: Settings }) {
    const settings = props.settings;

    const topColorDangerDesc = useTranslationArgsDeps("settings_colors_hour", ["Tab Bar", "24"], []);
    const topColorWarningDesc = useTranslationArgsDeps("settings_colors_day", ["Tab Bar", "5"], []);
    const topColorSuccessDesc = useTranslationArgsDeps("settings_colors_day", ["Tab Bar", "14"], []);
    const topColorOtherDesc = useTranslationArgsDeps("settings_colors_day_more", ["Tab Bar", "14"], []);

    const miniColorDangerDesc = useTranslationArgsDeps("settings_colors_hour", ["miniSakai", "24"], []);
    const miniColorWarningDesc = useTranslationArgsDeps("settings_colors_day", ["miniSakai", "5"], []);
    const miniColorSuccessDesc = useTranslationArgsDeps("settings_colors_day", ["miniSakai", "14"], []);
    const miniColorOtherDesc = useTranslationArgsDeps("settings_colors_day_more", ["miniSakai", "14"], []);

    const timetableColorDangerDesc = useTranslationArgsDeps("settings_colors_hour", ["時間割", "24"], []);
    const timetableColorWarningDesc = useTranslationArgsDeps("settings_colors_day", ["時間割", "5"], []);
    const timetableColorSuccessDesc = useTranslationArgsDeps("settings_colors_day", ["時間割", "14"], []);
    const timetableColorOtherDesc = useTranslationArgsDeps("settings_colors_day_more", ["時間割", "14"], []);

    return (
        <div className="cs-settings-tab">
            <TranslatedBooleanItem
                descriptionTag="settings_enable_dark_theme"
                value={settings.appInfo.useDarkTheme}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "boolean",
                        id: "appInfo.useDarkTheme",
                        newValue: v
                    })
                }
            />

            <TranslatedBooleanItem
                descriptionTag="settings_display_late_submit_assignment"
                value={settings.miniSakaiOption.showLateAcceptedEntry}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "boolean",
                        id: "miniSakaiOption.showLateAcceptedEntry",
                        newValue: v
                    })
                }
            />
            {/**
             * -----------------------------------------------------------------
             * Modified by: roz
             * Date       : 2025-05-28
             * Changes    : 未公開課題を非表示にする設定オプションを追加
             * Category   : 機能拡張
             * -----------------------------------------------------------------
             */}
            <TranslatedBooleanItem
                descriptionTag="settings_hide_unpublished_assignments"
                value={settings.miniSakaiOption.hideUnpublishedAssignments}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "boolean",
                        id: "miniSakaiOption.hideUnpublishedAssignments",
                        newValue: v
                    })
                }
            />
            <TranslatedNumberItem
                descriptionTag="settings_assignment_cache"
                value={settings.cacheInterval.assignment}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "number",
                        id: "cacheInterval.assignment",
                        newValue: v
                    })
                }
            />
            <TranslatedNumberItem
                descriptionTag="settings_quizzes_cache"
                value={settings.cacheInterval.quiz}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "number",
                        id: "cacheInterval.quiz",
                        newValue: v
                    })
                }
            />

            <StringItem
                description={topColorDangerDesc}
                value={settings.color.topDanger}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.topDanger",
                        newValue: v
                    })
                }
            />
            <StringItem
                description={topColorWarningDesc}
                value={settings.color.topWarning}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.topWarning",
                        newValue: v
                    })
                }
            />
            <StringItem
                description={topColorSuccessDesc}
                value={settings.color.topSuccess}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.topSuccess",
                        newValue: v
                    })
                }
            />
            <StringItem
                description={topColorOtherDesc}
                value={settings.color.topOther}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.topOther",
                        newValue: v
                    })
                }
            />

            <StringItem
                description={miniColorDangerDesc}
                value={settings.color.miniDanger}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.miniDanger",
                        newValue: v
                    })
                }
            />
            <StringItem
                description={miniColorWarningDesc}
                value={settings.color.miniWarning}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.miniWarning",
                        newValue: v
                    })
                }
            />
            <StringItem
                description={miniColorSuccessDesc}
                value={settings.color.miniSuccess}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.miniSuccess",
                        newValue: v
                    })
                }
            />
            <StringItem
                description={miniColorOtherDesc}
                value={settings.color.miniOther}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.miniOther",
                        newValue: v
                    })
                }
            />

            <StringItem
                description={timetableColorDangerDesc}
                value={settings.color.timetableDanger}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.timetableDanger",
                        newValue: v
                    })
                }
            />
            <StringItem
                description={timetableColorWarningDesc}
                value={settings.color.timetableWarning}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.timetableWarning",
                        newValue: v
                    })
                }
            />
            <StringItem
                description={timetableColorSuccessDesc}
                value={settings.color.timetableSuccess}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.timetableSuccess",
                        newValue: v
                    })
                }
            />
            <StringItem
                description={timetableColorOtherDesc}
                value={settings.color.timetableOther}
                onChange={(v) =>
                    props.onSettingsChange({
                        type: "string",
                        id: "color.timetableOther",
                        newValue: v
                    })
                }
            />

            <ResetColorButton
                onClick={() =>
                    props.onSettingsChange({
                        type: "reset-color"
                    })
                }
            />
        </div>
    );
}

function SettingsItem(props: {
    description: string;
    display: boolean;
    children: React.ReactNode;
    labelClass?: string;
}) {
    if (!props.display) return null;

    return (
        <div className="cp-settings">
            <p className="cp-settings-text">{props.description}</p>
            <label className={props.labelClass ?? ""}>{props.children}</label>
        </div>
    );
}

function BooleanItem(props: {
    description: string;
    display?: boolean;
    value: boolean;
    onChange: (newValue: boolean) => void;
}) {
    return (
        <SettingsItem description={props.description} display={props.display ?? true} labelClass="cs-toggle-btn">
            <input type="checkbox" checked={props.value} onChange={(ev) => props.onChange(ev.target.checked)}></input>
            <span className="cs-settings-toggle-slider round"></span>
        </SettingsItem>
    );
}

function TranslatedBooleanItem(props: {
    descriptionTag: string;
    display?: boolean;
    value: boolean;
    onChange: (newValue: boolean) => void;
}) {
    const description = useTranslationDeps(props.descriptionTag, [props.descriptionTag]);
    return (
        <BooleanItem description={description} display={props.display} value={props.value} onChange={props.onChange} />
    );
}

function NumberItem(props: {
    description: string;
    display?: boolean;
    value: number;
    onChange: (newValue: number) => void;
}) {
    return (
        <SettingsItem description={props.description} display={props.display ?? true}>
            <input
                type="number"
                className="cp-settings-inputbox"
                value={props.value}
                onChange={(ev) => props.onChange(parseInt(ev.target.value))}
            ></input>
        </SettingsItem>
    );
}

function TranslatedNumberItem(props: {
    descriptionTag: string;
    display?: boolean;
    value: number;
    onChange: (newValue: number) => void;
}) {
    const description = useTranslationDeps(props.descriptionTag, [props.descriptionTag]);
    return (
        <NumberItem description={description} display={props.display} value={props.value} onChange={props.onChange} />
    );
}

function StringItem(props: {
    description: string;
    display?: boolean;
    value: string;
    onChange: (newValue: string) => void;
}) {
    return (
        <SettingsItem description={props.description} display={props.display ?? true}>
            <input
                type="color"
                className="cp-settings-inputbox"
                value={props.value}
                onChange={(ev) => props.onChange(ev.target.value)}
            ></input>
        </SettingsItem>
    );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TranslatedStringItem(props: {
    descriptionTag: string;
    display?: boolean;
    value: string;
    onChange: (newValue: string) => void;
}) {
    const description = useTranslationDeps(props.descriptionTag, [props.descriptionTag]);
    return (
        <StringItem description={description} display={props.display} value={props.value} onChange={props.onChange} />
    );
}

function ResetColorButton(props: { onClick: () => void }) {
    const desc = useTranslation("settings_reset_colors");

    return (
        <div className="cp-settings">
            <p className="cp-settings-text">{desc}</p>
            <label>
                <input type="button" value="reset" onClick={props.onClick}></input>
            </label>
        </div>
    );
}
