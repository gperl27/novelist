import { Action, combineReducers } from "redux";
import { entitiesReducer, EntityActionTypes } from "./entities";
import { ContentActionTypes, contentReducer } from "./content";
import { ThunkAction } from "redux-thunk";

enum Types {
  SetStore = "SET_STORE",
}

interface SetStoreAction {
  type: Types.SetStore;
  payload: RootState;
}

type AppActionTypes = SetStoreAction | EntityActionTypes | ContentActionTypes;

const appReducer = combineReducers({
  entities: entitiesReducer,
  content: contentReducer,
});

export function setStore(payload: RootState) {
  return {
    type: Types.SetStore,
    payload,
  };
}

export const rootReducer = (
  state: RootState = {} as RootState,
  action: AppActionTypes
) => {
  if (action.type === Types.SetStore) {
    return action.payload;
  } else {
    return appReducer(state, action);
  }
};

export type RootState = ReturnType<typeof appReducer>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
