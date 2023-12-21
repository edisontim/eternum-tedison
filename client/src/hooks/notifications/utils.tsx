import { useMemo } from "react";
import { divideByPrecision, getEntityIdFromKeys, getPosition } from "../../utils/utils";
import { LABOR_CONFIG, Position, Resource, ResourcesIds } from "@bibliothecadao/eternum";
import { unpackResources } from "../../utils/packedData";
import { getRealm } from "../../utils/realms";
import { Component, HasValue, getComponentValue, runQuery } from "@dojoengine/recs";
import { CarrierType, EventType, NotificationType, extractAndCleanKey } from "../store/useNotificationsStore";
import { calculateNextHarvest } from "../../components/cityview/realm/labor/laborUtils";
import { LevelIndex } from "../helpers/useLevel";

export type realmsResources = { realmEntityId: bigint; resourceIds: number[] }[];
export type realmsPosition = { realmId: bigint; position: Position }[];
export type UpdatedEntity = {
  entityKeys: string[];
  modelNames: string[];
};

/**
 * Get all resources present on each realm
 * @param realms
 * @returns
 */
export const useRealmsResource = (
  realms: {
    realmEntityId: bigint;
    realmId: bigint;
  }[],
): realmsResources => {
  return useMemo(() => {
    return realms
      .map(({ realmEntityId, realmId }) => {
        const { resourceTypesPacked, resourceTypesCount } = realmId
          ? getRealm(realmId)
          : { resourceTypesPacked: 0, resourceTypesCount: 0 };

        if (realmId) {
          let unpackedResources = unpackResources(BigInt(resourceTypesPacked), resourceTypesCount);
          return {
            realmEntityId,
            resourceIds: [ResourcesIds["Wheat"], ResourcesIds["Fish"]].concat(unpackedResources),
          };
        }
        return null;
      })
      .filter(Boolean) as { realmEntityId: bigint; resourceIds: number[] }[];
  }, [realms]);
};

/**
 * Gets all positions of each realm
 * @param realms
 * @returns
 */
export const useRealmsPosition = (
  realms: {
    realmEntityId: bigint;
    realmId: bigint;
  }[],
): realmsPosition => {
  return useMemo(() => {
    return realms.map(({ realmId }) => {
      return { realmId, position: getPosition(realmId) };
    });
  }, [realms]);
};

/**
 * Generate trade notifications from entity updates from graphql subscription
 * @param entityUpdates list of updated entities with keys and componentNames
 * @param Status Component
 * @returns
 */
export const generateTradeNotifications = (entityUpdates: UpdatedEntity[], Status: Component) => {
  const notifications = entityUpdates
    .map((update) => {
      if (update.modelNames.includes("Trade")) {
        const status = getComponentValue(Status, getEntityIdFromKeys(extractAndCleanKey(update.entityKeys)));
        switch (status?.value) {
          case 0:
            return { eventType: EventType.MakeOffer, keys: update.entityKeys };
          case 1:
            return {
              eventType: EventType.AcceptOffer,
              keys: update.entityKeys,
            };
          case 2:
            return {
              eventType: EventType.CancelOffer,
              keys: update.entityKeys,
            };
          default:
            return null;
        }
      }
      return null;
    })
    .filter(Boolean) as NotificationType[];

  // Remove consecutive duplicates
  return notifications.reduce((acc, curr, idx, array) => {
    if (idx === 0 || JSON.stringify(curr) !== JSON.stringify(array[idx - 1])) {
      acc.push(curr);
    }
    return acc;
  }, [] as NotificationType[]);
};

/**
 * Generate labor notifications from realm resources
 * @param resourcesPerRealm list of objects with realmEntityId and resourceIds of the realm
 * @param nextBlockTimestamp next block timestamp
 * @param Labor Component
 * @returns
 */
export const generateLaborNotifications = (
  resourcesPerRealm: { realmEntityId: bigint; resourceIds: number[] }[],
  getRealmLevelBonus: (level: number, levelIndex: LevelIndex) => number,
  getHyperstructureLevelBonus: (level: number, levelIndex: LevelIndex) => number,
  nextBlockTimestamp: number,
  realmLevel: number,
  hyperstructureLevel: number,
  Labor: Component,
) => {
  const notifications: NotificationType[] = [];
  resourcesPerRealm.forEach(({ realmEntityId, resourceIds }) => {
    resourceIds.forEach((resourceId) => {
      const isFood = [ResourcesIds["Wheat"], ResourcesIds["Fish"]].includes(resourceId);
      const labor = getComponentValue(Labor, getEntityIdFromKeys([BigInt(realmEntityId), BigInt(resourceId)])) as
        | { balance: number; last_harvest: number; multiplier: number }
        | undefined;
      const realmLevelBonus = getRealmLevelBonus(realmLevel, isFood ? LevelIndex.FOOD : LevelIndex.RESOURCE);
      const hyperstructureLevelBonus = getHyperstructureLevelBonus(
        hyperstructureLevel,
        isFood ? LevelIndex.FOOD : LevelIndex.RESOURCE,
      );
      const harvest =
        labor && nextBlockTimestamp
          ? calculateNextHarvest(
              labor.balance,
              labor.last_harvest,
              labor.multiplier,
              LABOR_CONFIG.base_labor_units,
              isFood ? LABOR_CONFIG.base_food_per_cycle : LABOR_CONFIG.base_resources_per_cycle,
              nextBlockTimestamp,
              realmLevelBonus,
              hyperstructureLevelBonus,
            )
          : 0;

      if (harvest > 0) {
        notifications.push({
          eventType: EventType.Harvest,
          keys: [realmEntityId.toString(), resourceId.toString()],
          data: {
            harvestAmount: divideByPrecision(harvest),
          },
        });
      }
    });
  });

  return notifications;
};

/**
 * Generate claimable orders notifications from realm positions by checking if any order has arrived on that position
 * @param realmPositions
 * @param FungibleEntities
 * @param Position
 * @param ArrivalTime
 * @param Trade
 * @param nextBlockTimestamp
 * @returns
 */
export const generateEmptyChestNotifications = (
  realmPositions: realmsPosition,
  Inventory: Component,
  Position: Component,
  ArrivalTime: Component,
  CaravanMembers: Component,
  Realm: Component,
  ForeignKey: Component,
  nextBlockTimestamp: number,
  getResourcesFromInventory: (entityId: bigint) => {
    resources: Resource[];
    indices: number[];
  },
) => {
  let notifications: NotificationType[] = [];
  for (const { realmId, position: realmPosition } of realmPositions) {
    const entitiesAtPositionWithInventory = runQuery([
      HasValue(Inventory, {
        items_count: 1,
      }),
      HasValue(Position, {
        x: realmPosition?.x,
        y: realmPosition?.y,
      }),
    ]);

    const ids = Array.from(runQuery([HasValue(Realm, { realm_id: realmId })]));
    let realmEntityId = ids.length > 0 ? getComponentValue(Realm, ids[0])!.entity_id : undefined;

    for (const id of entitiesAtPositionWithInventory) {
      const arrivalTime = getComponentValue(ArrivalTime, id) as { arrives_at: number } | undefined;
      const caravanMembers = getComponentValue(CaravanMembers, id);

      // get key
      let entityId = getComponentValue(Position, id)!.entity_id;
      const { resources, indices } = getResourcesFromInventory(entityId);

      let carrierType = caravanMembers ? CarrierType.Caravan : CarrierType.Raiders;

      if (arrivalTime?.arrives_at && arrivalTime.arrives_at <= nextBlockTimestamp) {
        notifications.push({
          eventType: EventType.EmptyChest,
          keys: [entityId.toString()],
          data: {
            destinationRealmId: realmId,
            carrierType,
            realmEntityId,
            entityId: BigInt(entityId),
            resources,
            indices,
          },
        });
      }
    }
  }

  return notifications;
};