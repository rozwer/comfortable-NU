import { EntityProtocol, EntryProtocol } from "../entity/type";

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : エントリーマージ時にcheckTimestampフィールドを保持
 * Category   : データ処理
 * -----------------------------------------------------------------
 */

const getEntitiesMap = <Entity extends EntityProtocol>(entities: Array<Entity>): Map<string, Entity> => {
    return entities.reduce((map, entity) => {
        return map.set(entity.course.id, entity);
    }, new Map<string, Entity>());
};

export const mergeEntities = <Entity extends EntityProtocol>(oldEntities: Array<Entity>, newEntities: Array<Entity>): Array<Entity> => {
    const entities: Array<Entity> = [];
    const oldEntityMap = getEntitiesMap(oldEntities);
    const newEntityMap = getEntitiesMap(newEntities);
    newEntityMap.forEach((entity, id) => {
        const oldEntity = oldEntityMap.get(id);
        if (oldEntity !== undefined) {
            entity.entries = mergeEntries(oldEntity.getEntriesMap(), entity.getEntriesMap());
            entity.isRead = oldEntity.isRead;
        }
        entities.push(entity);
    });
    return entities;
};

export const mergeEntries = <Entry extends EntryProtocol>(oldEntryMap: Map<string, Entry>, newEntryMap: Map<string, Entry>): Array<Entry> => {
    const entries: Array<Entry> = [];
    newEntryMap.forEach((entry, id) => {
        const oldEntry = oldEntryMap.get(id);
        if (oldEntry !== undefined) {
            entry.hasFinished = oldEntry.hasFinished;
            // checkTimestampフィールドも保持する
            if ((oldEntry as any).checkTimestamp) {
                (entry as any).checkTimestamp = (oldEntry as any).checkTimestamp;
            }
        }
        entries.push(entry);
    });
    return entries;
};
