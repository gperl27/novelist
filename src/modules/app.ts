import { setEntityStore } from "./entities";
import { AppThunk } from "./index";
import { db, DbEntity, flatToHierarchy } from "../index";
import { Content, setContentStore } from "./content";

export type AllDocsEntity = PouchDB.Core.ExistingDocument<DbEntity>;
export type AllDocsContent = PouchDB.Core.ExistingDocument<Content>;

export const updateStores = (): AppThunk => async (dispatch) => {
  // eslint-disable-next-line @typescript-eslint/camelcase
  return db.allDocs({ include_docs: true }).then((docs) => {
    const entities = docs.rows
      .filter((row) => {
        if (!row.doc) {
          return false;
        }
        const doc = row.doc as AllDocsEntity;

        return doc.type === "entity";
      })
      .map((row) => row.doc);

    const content = docs.rows
      .filter((row) => {
        if (!row.doc) {
          return false;
        }
        const doc = row.doc as AllDocsContent;
        return doc.type === "content";
      })
      .map((row) => row.doc);

    const entitiesIndex: { [key: string]: DbEntity } = {};
    entities.forEach(function (item) {
      if (item) {
        entitiesIndex[item._id] = item as DbEntity;
      }
    });

    dispatch(
      setEntityStore({
        entitiesIndex,
        entities: flatToHierarchy(
          entities as DbEntity[],
          undefined,
          entitiesIndex
        ),
      })
    );
    dispatch(
      setContentStore({
        content: content as Content[],
      })
    );
  });
};
