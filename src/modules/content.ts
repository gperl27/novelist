import { AppThunk } from "./index";
import { PersistenceSchema } from "./entities";
import { v4 as uuidv4 } from "uuid";
import { db } from "../index";
import { updateStores } from "./app";

export interface Content extends PersistenceSchema {
  name: string;
  text: string;
}

interface ContentState {
  selectedContentId?: string;
  content: Content[];
  showContentRevisions?: boolean;
  showRenameContentModal: boolean;
}

export enum ContentTypes {
  SetContentStore = "SET_CONTENT_STORE",
  SetContent = "SET_CONTENT",
  SelectContent = "SELECT_CONTENT",
  UpdateContent = "UPDATE_CONTENT",
  FindAndReplace = "FIND_AND_REPLACE",
  SetShowContentRevisions = "SET_SHOW_CONTENT_REVISIONS",
  SetShowRenameContentModal = "SET_SHOW_RENAME_CONTENT_MODAL",
}

interface SetContentStore {
  type: ContentTypes.SetContentStore;
  payload: ContentState;
}

interface SetContent {
  type: ContentTypes.SetContent;
  payload: Content[];
}

interface SelectContent {
  type: ContentTypes.SelectContent;
  payload: string;
}

interface UpdateContent {
  type: ContentTypes.UpdateContent;
  payload: Content;
}

interface FindAndReplace {
  type: ContentTypes.FindAndReplace;
  payload: [string, string];
}

interface SetShowContentRevisions {
  type: ContentTypes.SetShowContentRevisions;
  payload: boolean;
}

interface SetShowRenameContentModalAction {
  type: ContentTypes.SetShowRenameContentModal;
  payload: boolean;
}

export type ContentActionTypes =
  | SetContent
  | SelectContent
  | UpdateContent
  | FindAndReplace
  | SetContentStore
  | SetShowContentRevisions
  | SetShowRenameContentModalAction;

export const addNewContent = (title?: string): AppThunk => async (dispatch) => {
  const _id = uuidv4();
  const content: Omit<Content, "_rev"> = {
    _id,
    name: title ?? "untitled",
    text: "",
    type: "content",
  };

  dispatch(selectContent(_id));
  await db.put(content);
  await dispatch(updateStores());
};

export function setContentStore(store: ContentState): ContentActionTypes {
  return {
    type: ContentTypes.SetContentStore,
    payload: store,
  };
}

export function setShowContentRevisions(payload: boolean): ContentActionTypes {
  return {
    type: ContentTypes.SetShowContentRevisions,
    payload,
  };
}

export function setContent(content: Content[]): ContentActionTypes {
  return {
    type: ContentTypes.SetContent,
    payload: content,
  };
}

export function selectContent(contentId: string): ContentActionTypes {
  return {
    type: ContentTypes.SelectContent,
    payload: contentId,
  };
}

export const updateContent = (content: Content): AppThunk => async (
  dispatch,
  getState
) => {
  const isDeleting = content._deleted;
  await db.put(content);
  await dispatch(updateStores());

  if (isDeleting) {
    const currentContent = getState().content.content;
    if (currentContent.length > 0) {
      dispatch(selectContent(currentContent[0]._id));
    } else {
      dispatch(addNewContent());
    }
  }
};

export const findAndReplace = (
  findAndReplaceTuple: [string, string]
): AppThunk => async (dispatch, getState) => {
  const [find, replace] = findAndReplaceTuple;
  const findAll = new RegExp(find, "g");

  const content = getState().content.content.map((cont) => {
    return {
      ...cont,
      name: cont.name.replace(findAll, replace),
      text: cont.text.replace(findAll, replace),
    };
  });
  await db.bulkDocs(content);
  await dispatch(updateStores());
};

export function setShowRenameContentModal(
  isShowing: boolean
): ContentActionTypes {
  return {
    type: ContentTypes.SetShowRenameContentModal,
    payload: isShowing,
  };
}

export const contentFixture = [
  {
    _id: "100",
    type: "content",
    name: "Chapter 1",
    text: "It was the best of times, it was the worst of times",
  },
  {
    _id: "101",
    type: "content",
    name: "Chapter 2",
    text: "So it goes...",
  },
];

const initialState: ContentState = {
  content: [],
  showContentRevisions: false,
  showRenameContentModal: false,
};

export function contentReducer(
  state = initialState,
  action: ContentActionTypes
) {
  switch (action.type) {
    case ContentTypes.SetContent:
      return {
        ...state,
        content: action.payload,
      };
    case ContentTypes.SelectContent:
      return {
        ...state,
        selectedContentId: action.payload,
      };
    case ContentTypes.FindAndReplace: {
      const [find, replace] = action.payload;
      const findAll = new RegExp(find, "g");

      const content = state.content.map((cont) => {
        return {
          ...cont,
          name: cont.name.replace(findAll, replace),
          text: cont.text.replace(findAll, replace),
        };
      });

      return {
        ...state,
        content,
      };
    }
    case ContentTypes.SetContentStore:
      return {
        ...state,
        content: action.payload.content,
      };
    case ContentTypes.SetShowContentRevisions: {
      return {
        ...state,
        showContentRevisions: action.payload,
      };
    }
    case ContentTypes.SetShowRenameContentModal:
      return {
        ...state,
        showRenameContentModal: action.payload,
      };
    default:
      return state;
  }
}
