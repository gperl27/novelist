import { db, DbEntity } from "../index";
import { v4 as uuidv4 } from "uuid";
import { AppThunk } from "./index";
import { updateStores } from "./app";

export enum EntityTypes {
  SetEntityStore = "SET_ENTITY_STORE",
  SelectEntities = "SELECT_ENTITIES",
  UpdateEntity = "UPDATE_ENTITY",
  SelectEntity = "SELECT_ENTITY",
  SetDeleteEntityModal = "SET_DELETE_ENTITY_MODAL",
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
  payload: boolean;
}

interface SetDeleteEntityModal {
  type: EntityTypes.SetDeleteEntityModal;
  payload: boolean;
}

type EntityActionTypes =
  | SelectEntities
  | UpdateEntity
  | SetEntityStore
  | SelectEntity
  | SetEditEntityModal
  | SetDeleteEntityModal
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

export function setEditEntityModal(isShowing: boolean) {
  return {
    type: EntityTypes.SetEditEntityModal,
    payload: isShowing,
  };
}

export function setDeleteEntityModal(isShowing: boolean) {
  return {
    type: EntityTypes.SetDeleteEntityModal,
    payload: isShowing,
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
  entities:
    | Omit<Entity, "_rev">
    | Omit<Entity, "_rev">[]
    | Omit<DbEntity, "_rev">
    | Omit<DbEntity, "_rev">[]
): AppThunk => async (dispatch) => {
  let updatedEntities = Array.isArray(entities) ? entities : [entities];
  if (areEntities(updatedEntities)) {
    updatedEntities = updatedEntities.map((entity) => {
      return {
        ...entity,
        entities: entity.entities.map((entity) => entity._id),
      };
    });
  }

  await db.bulkDocs(updatedEntities);
  await dispatch(updateStores());
};

export const addEntity = (
  entity: Pick<Entity, "name" | "shouldDeepLink" | "shouldAutoComplete">,
  parentEntity?: Entity
): AppThunk => async (dispatch) => {
  const _id = uuidv4();
  const dbEntity: Omit<Entity, "_rev"> = {
    ...entity,
    _id,
    description: "",
    isEditing: false,
    entity: parentEntity ? parentEntity._id : undefined,
    type: "entity",
    entities: [],
  };

  const updatedEntities = [dbEntity];

  if (parentEntity) {
    updatedEntities.push({
      ...parentEntity,
      entities: parentEntity.entities.concat(dbEntity as Entity),
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
  PouchDB.Core.GetMeta & {
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
}

export interface EntityState {
  entitiesIndex: { [key: string]: DbEntity };
  entities: Entity[];
  flatEntities: DbEntity[];
  selectedEntityIds: string[];
  selectedEntityId?: string;
  editSettingsEntityId?: string;
  showEditEntityModal: boolean;
  showDeleteEntityModal: boolean;
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
  showDeleteEntityModal: false,
  showEditEntityModal: false,
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
        showEditEntityModal: action.payload,
      };
    case EntityTypes.SetDeleteEntityModal:
      return {
        ...state,
        showDeleteEntityModal: action.payload,
      };

    default:
      return state;
  }
}
