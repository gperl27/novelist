import { Action, combineReducers } from "redux";
import { entitiesReducer } from "./entities";
import { contentReducer } from "./content";
import { ThunkAction } from "redux-thunk";

export const rootReducer = combineReducers({
  entities: entitiesReducer,
  content: contentReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
