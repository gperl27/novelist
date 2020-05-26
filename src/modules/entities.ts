import { db, DbEntity } from "../index";
import { v4 as uuidv4 } from "uuid";
import { AppThunk } from "./index";
import { updateStores } from "./app";

export enum EditEntityModes {
  Add,
  Edit,
}

export enum EntityTypes {
  SetEntityStore = "SET_ENTITY_STORE",
  SelectEntities = "SELECT_ENTITIES",
  UpdateEntity = "UPDATE_ENTITY",
  SelectEntity = "SELECT_ENTITY",
  SetEditEntityModal = "SET_EDIT_ENTITY_MODAL",
  SelectEditSettingsEntity = "SELECT_EDIT_SETTINGS_ENTITY",
}

interface SelectEntities {
  type: EntityTypes.SelectEntities;
  payload: string[];
}

interface UpdateEntity {
  type: EntityTypes.UpdateEntity;
  payload: Entity;
}

interface SetEntityStore {
  type: EntityTypes.SetEntityStore;
  payload: Partial<EntityState>;
}

interface SelectEntity {
  type: EntityTypes.SelectEntity;
  payload: string | undefined;
}

interface SelectEditEntitySettings {
  type: EntityTypes.SelectEditSettingsEntity;
  payload: string | undefined;
}

interface SetEditEntityModal {
  type: EntityTypes.SetEditEntityModal;
  payload: {
    showEditEntityModal: boolean;
    mode?: EditEntityModes;
  };
}

export type EntityActionTypes =
  | SelectEntities
  | UpdateEntity
  | SetEntityStore
  | SelectEntity
  | SetEditEntityModal
  | SelectEditEntitySettings;

export function selectEntity(entityId?: string): EntityActionTypes {
  return {
    type: EntityTypes.SelectEntity,
    payload: entityId,
  };
}

export function selectEditSettingsEntity(entityId?: string): EntityActionTypes {
  return {
    type: EntityTypes.SelectEditSettingsEntity,
    payload: entityId,
  };
}

export function setEditEntityModal(
  isShowing: boolean,
  mode?: EditEntityModes
): EntityActionTypes {
  return {
    type: EntityTypes.SetEditEntityModal,
    payload: {
      showEditEntityModal: isShowing,
      mode,
    },
  };
}

function isEntity(entity: any): entity is Entity {
  return entity.entities.every(
    (ent: any): ent is Entity => typeof ent._id !== "undefined"
  );
}

function areEntities(entities: any[]): entities is Entity[] {
  return entities.every(isEntity);
}

export const updateEntities = (
  entities: Omit<Entity | DbEntity, "_rev"> | Omit<Entity | DbEntity, "_rev">[]
): AppThunk => async (dispatch) => {
  const coercedToArrayEntities = Array.isArray(entities)
    ? entities
    : [entities];
  const updatedEntities = coercedToArrayEntities.map((entity) => {
    if (isEntity(entity)) {
      return {
        ...entity,
        entities: entity.entities.map((entity) => entity._id),
      };
    }

    return entity;
  });

  await db.bulkDocs(updatedEntities);
  await dispatch(updateStores());
};

export const addEntity = (
  entity: Pick<Entity, "name" | "shouldDeepLink" | "shouldAutoComplete">,
  parentId?: string
): AppThunk => async (dispatch, getState) => {
  const _id = uuidv4();
  const dbEntity: Omit<Entity | DbEntity, "_rev"> = {
    ...entity,
    _id,
    description: "",
    isEditing: false,
    entity: parentId,
    type: "entity",
    entities: [],
  };

  const updatedEntities = [dbEntity];

  if (parentId) {
    const parentEntity = getState().entities.entitiesIndex[parentId];
    updatedEntities.push({
      ...parentEntity,
      entities: parentEntity.entities.concat(dbEntity._id),
    });
  }

  await dispatch(updateEntities(updatedEntities));
};

export function setEntityStore(store: Partial<EntityState>): EntityActionTypes {
  return {
    type: EntityTypes.SetEntityStore,
    payload: store,
  };
}

export type PersistenceSchema = PouchDB.Core.IdMeta &
  PouchDB.Core.GetMeta &
  PouchDB.Core.ChangesMeta & {
    type: string;
  };

export interface Entity extends PersistenceSchema {
  name: string;
  description: string;
  entity?: string;
  entities: Entity[];
  shouldAutoComplete: boolean;
  shouldDeepLink: boolean;
  isEditing: boolean;
  _deleted?: boolean;
}

export interface EntityState {
  entitiesIndex: { [key: string]: DbEntity };
  entities: Entity[];
  flatEntities: DbEntity[];
  selectedEntityIds: string[];
  selectedEntityId?: string;
  editSettingsEntityId?: string;
  showEditEntityModal: boolean;
  editEntityMode: EditEntityModes;
}

export const entityDocuments: Omit<DbEntity, "_rev">[] = [
  {
    _id: "1",
    description: "",
    type: "entity",
    name: "Characters",
    entities: ["2"],
    shouldAutoComplete: false,
    shouldDeepLink: false,
    isEditing: false,
  },
  {
    _id: "2",
    description: "",
    type: "entity",
    name: "Kubo",
    entity: "1",
    entities: [],
    shouldAutoComplete: true,
    shouldDeepLink: false,
    isEditing: false,
  },
  {
    _id: "3",
    description: "",
    type: "entity",
    name: "Plot",
    entities: ["4"],
    shouldAutoComplete: false,
    shouldDeepLink: false,
    isEditing: false,
  },
  {
    _id: "4",
    description: "",
    type: "entity",
    entity: "3",
    entities: [],
    name: "The Beginning",
    shouldAutoComplete: false,
    shouldDeepLink: false,
    isEditing: false,
  },
];

const initialState: EntityState = {
  entitiesIndex: {},
  selectedEntityIds: [],
  entities: [],
  flatEntities: [],
  showEditEntityModal: false,
  editEntityMode: EditEntityModes.Add,
};

export function entitiesReducer(
  state = initialState,
  action: EntityActionTypes
) {
  switch (action.type) {
    case EntityTypes.SelectEntities:
      return {
        ...state,
        selectedEntityIds: action.payload,
      };
    case EntityTypes.SetEntityStore: {
      return {
        ...state,
        ...action.payload,
      };
    }
    case EntityTypes.SelectEntity: {
      return {
        ...state,
        selectedEntityId: action.payload,
      };
    }
    case EntityTypes.SelectEditSettingsEntity: {
      return {
        ...state,
        editSettingsEntityId: action.payload,
      };
    }
    case EntityTypes.SetEditEntityModal:
      return {
        ...state,
        showEditEntityModal: action.payload.showEditEntityModal,
        editEntityMode: action.payload.mode ?? EditEntityModes.Add,
      };

    default:
      return state;
  }
}
