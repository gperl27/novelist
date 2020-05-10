import "./App.css";
import React, { useEffect, useRef } from "react";
import MonacoEditor from "react-monaco-editor";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./modules";
import {
  EditEntityModes,
  entityDocuments,
  selectEditSettingsEntity,
  selectEntity,
  setEditEntityModal,
} from "./modules/entities";
import {
  Editable,
  EditEntitySettings,
  EntityListContainer,
} from "./components/EntityEditor";
import {
  addNewContent,
  Content,
  contentFixture,
  selectContent,
  updateContent,
} from "./modules/content";
import { Button, Form, Menu, Modal, PageHeader } from "antd";
import { db } from "./index";
import { useDebouncedCallback } from "use-debounce";
import { updateStores } from "./modules/app";
import { TextEditor, useAutoComplete } from "./components/TextEditor";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import * as monaco from "monaco-editor";

interface DirectoryProps {
  onClickNew?: () => void;
  onClickSelectContent?: (contentId?: string) => void;
}

function Directory(props: DirectoryProps) {
  const dispatch = useDispatch();
  const { content, selectedContent } = useSelector((state: RootState) => {
    const { content, selectedContentId } = state.content;
    const selectedContent = state.content.content.find(
      (c) => c._id === selectedContentId
    );

    return {
      selectedContent,
      content,
    };
  });

  function onClickNew() {
    dispatch(addNewContent());
    props.onClickNew && props.onClickNew();
  }

  const onClickSelectContent = (contentId: string) => () => {
    dispatch(selectContent(contentId));
    props.onClickSelectContent && props.onClickSelectContent(contentId);
  };

  const onSaveContentName = (content: Content) => (value: string) => {
    dispatch(
      updateContent({
        ...content,
        name: value,
      })
    );
  };

  return (
    <>
      <Menu
        selectedKeys={selectedContent ? [selectedContent._id.toString()] : []}
        mode={"inline"}
      >
        <Menu.ItemGroup title={"My Workbook"}>
          {content.map((cont) => {
            return (
              <Menu.Item
                onClick={onClickSelectContent(cont._id)}
                key={cont._id}
              >
                <Editable value={cont.name} onSave={onSaveContentName(cont)} />
              </Menu.Item>
            );
          })}
          <Menu.Item>
            <Button onClick={onClickNew} type={"primary"}>
              Add New
            </Button>
          </Menu.Item>
        </Menu.ItemGroup>
      </Menu>
    </>
  );
}

function App() {
  const monacoRef = useRef(monaco);
  // TODO: DONT USE REF, USE INSTANCE DIRECTLY
  useAutoComplete(monacoRef);
  const dispatch = useDispatch();
  const contentEditorRef = useRef<MonacoEditor>(null);
  const entityEditorRef = useRef<MonacoEditor>(null);
  const { selectedContent, selectedEntity } = useSelector(
    (state: RootState) => {
      const { selectedContentId } = state.content;
      const selectedContent = state.content.content.find(
        (c) => c._id === selectedContentId
      );

      const {
        selectedEntityId,
        entitiesIndex,
        showEditEntityModal,
        editSettingsEntityId,
      } = state.entities;
      const selectedEntity = selectedEntityId
        ? entitiesIndex[selectedEntityId]
        : undefined;
      const editSettingsEntity = editSettingsEntityId
        ? entitiesIndex[editSettingsEntityId]
        : undefined;

      return {
        selectedContent,
        selectedEntity,
        showEditEntityModal,
        editSettingsEntity,
      };
    }
  );
  const [debouncedCallback, cancel] = useDebouncedCallback((value: string) => {
    if (selectedContent) {
      dispatch(
        updateContent({
          ...selectedContent,
          text: value,
        })
      );
    }
  }, 1000);

  useEffect(() => {
    db.bulkDocs([...entityDocuments, ...contentFixture])
      .catch((e) => e)
      .finally(async () => {
        dispatch(updateStores());
        dispatch(selectContent("100"));
      });
  }, [dispatch]);

  function cancelAndUpdateContent() {
    cancel();

    const text = contentEditorRef?.current?.editor?.getValue();

    if (selectedContent && text) {
      dispatch(
        updateContent({
          ...selectedContent,
          text,
        })
      );
    }
  }

  function onClickSelectContent() {
    cancelAndUpdateContent();
  }

  function onClickNew() {
    cancelAndUpdateContent();
    contentEditorRef?.current?.editor?.focus();
  }

  return (
    <div style={{ height: "100%" }}>
      <ReflexContainer orientation="vertical">
        <ReflexElement flex={0.5}>
          <Directory
            onClickSelectContent={onClickSelectContent}
            onClickNew={onClickNew}
          />
        </ReflexElement>
        <ReflexSplitter
          propagate={true}
          onResize={() => {
            contentEditorRef?.current?.editor?.layout();
            entityEditorRef?.current?.editor?.layout();
          }}
        />
        <ReflexElement flex={2}>
          <div style={{ height: "100%", width: "100%" }}>
            <TextEditor
              ref={contentEditorRef}
              onChange={(text) => {
                debouncedCallback(text);
              }}
              value={selectedContent?.text}
            />
          </div>
        </ReflexElement>
        <ReflexSplitter
          propagate={true}
          onResize={() => {
            contentEditorRef?.current?.editor?.layout();
            entityEditorRef?.current?.editor?.layout();
          }}
        />
        <ReflexElement flex={1.5}>
          <div style={{ height: "100%", width: "100%" }}>
            {selectedEntity ? (
              <div style={{ height: "100%", width: "100%" }}>
                <PageHeader
                  onBack={() => dispatch(selectEntity())}
                  title={selectedEntity?.name}
                  extra={[
                    <Button
                      onClick={() => {
                        dispatch(selectEditSettingsEntity(selectedEntity?._id));
                        dispatch(
                          setEditEntityModal(true, EditEntityModes.Edit)
                        );
                      }}
                    >
                      Settings
                    </Button>,
                  ]}
                />
                <TextEditor
                  ref={entityEditorRef}
                  onChange={(text) => {
                    console.log(text, "text");
                  }}
                  value={selectedEntity?.description}
                />
              </div>
            ) : (
              <EntityListContainer />
            )}
          </div>
        </ReflexElement>
      </ReflexContainer>
      <EditEntitySettingsModal />
    </div>
  );
}

const EditEntitySettingsModal = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const { showEditEntityModal, editEntityMode } = useSelector(
    (state: RootState) => {
      const {
        showEditEntityModal,
        editSettingsEntityId,
        entitiesIndex,
        editEntityMode,
      } = state.entities;
      const editSettingsEntity = editSettingsEntityId
        ? entitiesIndex[editSettingsEntityId]
        : undefined;

      return {
        showEditEntityModal,
        editSettingsEntity,
        editEntityMode,
      };
    }
  );

  const onOk = () => {
    form.submit();
  };

  function hideEntityModal() {
    dispatch(setEditEntityModal(false));
  }

  return (
    <Modal
      title={
        editEntityMode === EditEntityModes.Edit ? "Edit Entity" : "Add Entity"
      }
      onCancel={hideEntityModal}
      visible={showEditEntityModal}
      onOk={onOk}
    >
      <EditEntitySettings form={form} />
    </Modal>
  );
};

export default App;
