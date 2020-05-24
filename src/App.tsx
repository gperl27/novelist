import "./App.css";
import React, { useEffect, useRef, useState } from "react";
import MonacoEditor, { MonacoDiffEditor } from "react-monaco-editor";
import { batch, useDispatch, useSelector } from "react-redux";
import { RootState } from "./modules";
import {
  EditEntityModes,
  entityDocuments,
  selectEditSettingsEntity,
  selectEntity,
  setEditEntityModal,
  updateEntities,
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
  setShowContentRevisions,
  updateContent,
} from "./modules/content";
import {
  Button,
  Divider,
  Dropdown,
  Form,
  Menu,
  Modal,
  PageHeader,
  Tag,
  Timeline,
  Tooltip,
} from "antd";
import { db } from "./index";
import { useDebouncedCallback } from "use-debounce";
import { updateStores } from "./modules/app";
import { TextEditor, useAutoComplete } from "./components/TextEditor";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import * as monaco from "monaco-editor";
import ReactMarkdown from "react-markdown";
import {
  ReadOutlined,
  EditOutlined,
  SettingOutlined,
  EyeOutlined,
} from "@ant-design/icons";
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { initVimMode } from "monaco-vim";

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
  const [isShowingContentPreview, setIsShowingContentPreview] = useState(false);
  const [revisions, setRevisions] = useState<
    (Content & PouchDB.Core.GetMeta)[]
  >([]);
  const [revisionComparer, setRevisionComparer] = useState(revisions[1]);
  const { selectedContent, selectedEntity, showContentRevisions } = useSelector(
    (state: RootState) => {
      const { selectedContentId, showContentRevisions } = state.content;
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
        showContentRevisions,
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

  const [debouncedUpdateEntity, cancelUpdateEntity] = useDebouncedCallback(
    (value: string) => {
      if (selectedEntity) {
        dispatch(
          updateEntities({
            ...selectedEntity,
            description: value,
          })
        );
      }
    },
    1000
  );

  // const { current: contentCurrent } = contentEditorRef;
  // const { current: entityCurrent } = entityEditorRef;
  //
  // useEffect(() => {
  //   const statusNode = document.getElementById("status");
  //
  //   let contentVimMode: any;
  //   if (contentCurrent?.editor) {
  //     contentVimMode = initVimMode(contentCurrent.editor, statusNode);
  //   }
  //
  //   return () => {
  //     contentVimMode?.dispose();
  //   };
  // }, [contentCurrent]);
  //
  const [ref, setRef] = useState<MonacoEditor | null>();
  //
  // useEffect(() => {
  //   const statusNode2 = document.getElementById("status2");
  //
  //   let entityVimMode: any;
  //   if (ref?.editor) {
  //     initVimMode(ref.editor, statusNode2);
  //   }
  // }, [ref]);

  useEffect(() => {
    db.bulkDocs([...entityDocuments, ...contentFixture])
      .catch((e) => e)
      .finally(async () => {
        dispatch(updateStores());
        dispatch(selectContent("100"));
      });
  }, [dispatch]);

  useEffect(() => {
    if (selectedContent) {
      db.get(selectedContent._id, {
        // revs: true,
        revs_info: true,
      }).then((doc) => {
        if (doc._revs_info) {
          const docs = doc._revs_info.map((revInfo) => {
            return {
              id: selectedContent._id,
              rev: revInfo.rev,
            };
          });
          db.bulkGet({ docs }).then((docs) => {
            console.log(docs, "docs");
            function isOk(
              doc: any
            ): doc is { ok: Content & PouchDB.Core.GetMeta } {
              return doc.hasOwnProperty("ok");
            }

            const transformedDocs = docs.results
              .map((doc) => doc.docs[0])
              .filter(isOk)
              .map((doc) => doc.ok);

            const filteredDocs = transformedDocs.filter((doc, index) => {
              index = index + 1;

              if (!transformedDocs[index]) {
                return true;
              }

              return doc.text !== transformedDocs[index].text;
            });

            setRevisions(filteredDocs);
            setRevisionComparer(filteredDocs[1]);
          });
        }
      });
    }
  }, [selectedContent]);

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

  function cancelAndUpdateEntityFromEditorRef() {
    cancelUpdateEntity();

    const text = entityEditorRef?.current?.editor?.getValue();

    if (selectedEntity && text) {
      dispatch(
        updateEntities({
          ...selectedEntity,
          description: text,
        })
      );
    }
  }

  function onClickBackInEntityEditor() {
    cancelAndUpdateEntityFromEditorRef();
    dispatch(selectEntity());
  }

  function onClickSelectContent() {
    cancelAndUpdateContent();
  }

  function onClickNew() {
    cancelAndUpdateContent();
    contentEditorRef?.current?.editor?.focus();
  }

  const config = {
    title: "Edit History",
    closable: true,
    footer: null,
    content: (
      <div>
        <Divider />
        <div style={{ maxHeight: "50vh", overflowY: "scroll" }}>
          <Timeline>
            {revisions.map((revision) => {
              return (
                <Timeline.Item key={revision._rev}>
                  + 20 additions - 12/8/10
                  <Tooltip title={"Compare to this revision"}>
                    <Button
                      onClick={() => {
                        setRevisionComparer(revision);
                        Modal.destroyAll();
                      }}
                      style={{ marginLeft: "0.2rem" }}
                      type={"link"}
                      icon={<EyeOutlined />}
                    />
                  </Tooltip>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </div>
      </div>
    ),
  };

  function onClickRevertContent() {
    if (selectedContent) {
      dispatch(
        updateContent({
          ...selectedContent,
          text: revisionComparer.text,
        })
      );
    }
  }

  return (
    <div style={{ height: "100%" }}>
      <div id="status" />
      <div id="status2" />
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
          <div style={{ height: "100%", width: "100%", overflowY: "hidden" }}>
            {!showContentRevisions ? (
              <PageHeader
                title={selectedContent?.name ?? "Untitled"}
                extra={[
                  <Button
                    style={{
                      background: isShowingContentPreview
                        ? "transparent"
                        : "yellow",
                    }}
                    shape={"circle"}
                    size={"small"}
                    icon={<EditOutlined />}
                    onClick={() => setIsShowingContentPreview(false)}
                  />,
                  <Button
                    style={{
                      background: isShowingContentPreview
                        ? "yellow"
                        : "transparent",
                    }}
                    shape={"circle"}
                    size={"small"}
                    icon={<ReadOutlined />}
                    onClick={() => setIsShowingContentPreview(true)}
                  />,
                  <Divider type={"vertical"} />,
                  <Dropdown
                    trigger={["click"]}
                    overlay={
                      <Menu>
                        <Menu.Item>Rename</Menu.Item>
                        <Menu.Item
                          onClick={() => {
                            if (selectedContent) {
                              dispatch(setShowContentRevisions(true));
                            }
                          }}
                        >
                          History
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item>Delete</Menu.Item>
                      </Menu>
                    }
                  >
                    <SettingOutlined style={{ marginLeft: "-2px" }} />
                  </Dropdown>,
                ]}
              />
            ) : (
              <PageHeader
                onBack={() => dispatch(setShowContentRevisions(false))}
                title={"History"}
                subTitle={"10/13/19 last edited"}
                tags={
                  <Tag
                    onClick={() =>
                      Modal.confirm({
                        title: "Revert Content",
                        content:
                          "Are you sure you want to revert to this content?",
                        onOk: onClickRevertContent,
                      })
                    }
                  >
                    Revert
                  </Tag>
                }
                extra={[
                  <Button onClick={() => Modal.confirm(config)}>
                    Full History
                  </Button>,
                ]}
              />
            )}
            {showContentRevisions && revisions[0] && revisionComparer ? (
              <MonacoDiffEditor
                height={"100%"}
                width={"100%"}
                language="markdown"
                original={revisions[0].text}
                value={revisionComparer.text}
              />
            ) : isShowingContentPreview ? (
              <div style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
                <ReactMarkdown source={selectedContent?.text} />
              </div>
            ) : (
              <TextEditor
                ref={contentEditorRef}
                onChange={(text) => {
                  debouncedCallback(text);
                }}
                value={selectedContent?.text}
              />
            )}
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
              <div
                style={{ height: "100%", width: "100%", overflowY: "hidden" }}
              >
                <PageHeader
                  onBack={onClickBackInEntityEditor}
                  title={selectedEntity?.name}
                  extra={[
                    <Button
                      onClick={() => {
                        batch(() => {
                          dispatch(
                            selectEditSettingsEntity(selectedEntity?._id)
                          );
                          dispatch(
                            setEditEntityModal(true, EditEntityModes.Edit)
                          );
                        });
                      }}
                    >
                      Settings
                    </Button>,
                  ]}
                />
                <TextEditor
                  // ref={entityEditorRef}
                  ref={(ref) => {
                    setRef(ref);
                  }}
                  onChange={(text) => {
                    debouncedUpdateEntity(text);
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
