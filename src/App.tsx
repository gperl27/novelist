import React, { RefObject, useEffect, useRef, useState } from "react";
import MonacoEditor from "react-monaco-editor";
import * as monacoEditor from "monaco-editor";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./modules";
import { Entity, entityDocuments, selectEntities } from "./modules/entities";
import { Editable, EntityEditor } from "./components/EntityEditor";
import {
  addNewContent,
  Content,
  contentFixture,
  selectContent,
  updateContent,
} from "./modules/content";
import { Button, Menu } from "antd";
import { db } from "./index";
import { useDebounce } from "use-debounce";
import { updateStores } from "./modules/app";

interface DirectoryProps {
  editorValue: string;
  editorRef: RefObject<MonacoEditor>;
}

function Directory(props: DirectoryProps) {
  const dispatch = useDispatch();
  const entities = useKeyEntities();
  const { content, selectedContent } = useSelector((state: RootState) => {
    const { content, selectedContentId } = state.content;
    const selectedContent = state.content.content.find(
      (c) => c._id === selectedContentId
    );

    return {
      selectedContent,
      content,
      entities,
    };
  });

  function onClickNew() {
    if (selectedContent) {
      dispatch(
        updateContent({
          ...selectedContent,
          text: props.editorValue,
        })
      );
    }
    dispatch(addNewContent());
    props.editorRef?.current?.editor?.focus();
  }

  const onClickSelectContent = (contentId: string) => () => {
    if (selectedContent) {
      if (selectedContent.text !== props.editorValue) {
        dispatch(
          updateContent({
            ...selectedContent,
            text: props.editorValue,
          })
        );
      }
    }
    dispatch(selectContent(contentId));
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
    <Menu
      selectedKeys={selectedContent ? [selectedContent._id.toString()] : []}
      mode={"inline"}
    >
      <Menu.ItemGroup title={"My Workbook"}>
        {content.map((cont) => {
          return (
            <Menu.Item onClick={onClickSelectContent(cont._id)} key={cont._id}>
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
  );
}

function useKeyEntities() {
  const { entities } = useSelector((state: RootState) => state.entities);

  const keyEntities: Entity[] = [];

  entities.forEach((entity) => {
    entity.entities.forEach((entity) => {
      keyEntities.push(entity);
    });
  });

  return keyEntities;
}

function App() {
  const dispatch = useDispatch();
  const { selectedContent } = useSelector((state: RootState) => {
    const { selectedContentId } = state.content;
    const selectedContent = state.content.content.find(
      (c) => c._id === selectedContentId
    );

    return {
      selectedContent,
    };
  });
  // const {entities} = useSelector((state: RootState) => state.entities)
  const valueFromSelected = selectedContent?.text ?? "";
  const [value, setValue] = useState(valueFromSelected);
  const [text] = useDebounce(value, 1000);
  const keyEntities = useKeyEntities();
  const monacoRef = useRef<typeof monacoEditor>();
  const ref = useRef<MonacoEditor>(null);

  useEffect(() => {
    if (selectedContent) {
      if (selectedContent.text !== text) {
        dispatch(
          updateContent({
            ...selectedContent,
            text,
          })
        );
      }
    }
  }, [dispatch, selectedContent, text]);

  useEffect(() => {
    setValue(valueFromSelected);
  }, [valueFromSelected]);

  function editorWillMount(monaco: typeof monacoEditor) {
    monacoRef.current = monaco;
  }

  React.useEffect(() => {
    db.bulkDocs([...entityDocuments, ...contentFixture])
      .catch((e) => e)
      .finally(() => {
        dispatch(updateStores());
      });
  }, [dispatch]);

  useEffect(() => {
    function createDependencyProposals(range: monacoEditor.IRange) {
      return keyEntities
        .filter((entity) => entity.shouldAutoComplete)
        .map((entity) => {
          return {
            label: entity.name,
            kind: monacoEditor.languages.CompletionItemKind.Function,
            insertText: entity.name,
            range,
          };
        });
    }

    const hover = monacoRef?.current?.languages.registerHoverProvider(
      "markdown",
      {
        provideHover: function (model, position) {
          const contents = keyEntities
            .filter(
              (entity) =>
                model.getWordAtPosition(position)?.word === entity.name
            )
            .map((entity) => {
              return {
                value:
                  "Cmd + click to go to " +
                  entity.name +
                  "\n\n" +
                  "## *" +
                  entity.name +
                  " docs here*",
              };
            });

          return {
            contents,
          };
        },
      }
    );

    const completion = monacoRef?.current?.languages.registerCompletionItemProvider(
      "markdown",
      {
        provideCompletionItems: function (model, position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return {
            suggestions: createDependencyProposals(range),
          };
        },
      }
    );

    return () => {
      hover?.dispose();
      completion?.dispose();
    };
  }, [keyEntities]);

  useEffect(() => {
    const providerMap = keyEntities.map((entity) => {
      const commandId = ref?.current?.editor?.addCommand(
        0,
        function () {
          dispatch(selectEntities([entity._id]));
        },
        ""
      );

      const provider = monacoRef?.current?.languages.registerCodeLensProvider(
        "markdown",
        {
          provideCodeLenses: function (model, token) {
            const matches = model
              .findMatches(entity.name, true, false, true, null, true)
              .reduce((acc, current) => {
                const dupe = acc.find(
                  (item) =>
                    item.range.startLineNumber === current.range.startLineNumber
                );

                if (!dupe) {
                  return acc.concat([current]);
                }

                return acc;
              }, [] as monacoEditor.editor.FindMatch[]);

            const lenses: monacoEditor.languages.CodeLens[] = matches.map(
              (match) => {
                return {
                  range: match.range,
                  command: {
                    id: commandId ?? "",
                    title: `@${entity.name}`,
                  },
                };
              }
            );

            return {
              dispose: () => undefined,
              lenses,
            };
          },
        }
      );

      return { provider };
    });

    return () => {
      providerMap.forEach((provider) => {
        provider.provider?.dispose();
      });
    };
  }, [dispatch, keyEntities]);

  return (
    <div style={{ height: "100%" }}>
      <div
        style={{
          height: "100%",
          display: "flex",
          paddingTop: "1rem",
          paddingBottom: "1rem",
        }}
      >
        <div style={{ flex: 1, paddingLeft: "1rem", paddingRight: "1rem" }}>
          <Directory editorRef={ref} editorValue={value} />
        </div>
        <div style={{ flex: 2 }}>
          <MonacoEditor
            onChange={(text) => {
              if (selectedContent) {
                setValue(text);
              }
            }}
            ref={ref}
            value={value}
            language="markdown"
            theme="vs-dark"
            editorWillMount={editorWillMount}
            options={{
              contextmenu: false,
              gotoLocation: {
                multiple: "goto",
                multipleDeclarations: "goto",
                multipleDefinitions: "goto",
                multipleImplementations: "goto",
                multipleReferences: "goto",
                multipleTypeDefinitions: "goto",
              },
            }}
          />
        </div>
        <div style={{ flex: 1.5, paddingLeft: "1rem", paddingRight: "1rem" }}>
          <EntityEditor />
        </div>
      </div>
    </div>
  );
}

export default App;
