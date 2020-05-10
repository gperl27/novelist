import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import "react-reflex/styles.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import { applyMiddleware, createStore } from "redux";
import { rootReducer } from "./modules";
import { Provider } from "react-redux";
import Pouch from "pouchdb";
import thunk from "redux-thunk";
import { Entity } from "./modules/entities";

export const db = new Pouch("novelist");

export interface DbEntity extends Omit<Entity, "entities"> {
  entities: string[];
}

export function flatToHierarchy(
  flat: DbEntity[],
  parentId?: string,
  index = {} as { [key: string]: DbEntity }
): Entity[] {
  const roots: Entity[] = [];

  if (Object.entries(index).length === 0) {
    flat.forEach(function (item) {
      index[item._id] = item;
    });
  }

  flat.forEach((node) => {
    if (!node.entity || node.entity === parentId) {
      const nestedEntityMap = node.entities.map((id) => index[id]);
      const filledNodes = {
        ...node,
        entities: flatToHierarchy(nestedEntityMap, node._id, index),
      };
      roots.push(filledNodes);
    }
  });

  return roots;
}

const store = createStore(rootReducer, applyMiddleware(thunk));

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
