import MonacoEditor, { MonacoEditorProps } from "react-monaco-editor";
import React, { Ref, RefObject, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../modules";
import * as monacoEditor from "monaco-editor";

export type TextEditorProps = MonacoEditorProps;

function useAutoUpdateEditorLayout(ref: RefObject<MonacoEditor>) {
  useEffect(() => {
    function updateDimensions() {
      ref?.current?.editor?.layout();
    }

    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("window", updateDimensions);
  }, [ref]);
}

export function useAutoComplete(monacoRef: RefObject<typeof monacoEditor>) {
  const { entities } = useSelector((state: RootState) => {
    const { flatEntities } = state.entities;
    return {
      entities: flatEntities,
    };
  });

  useEffect(() => {
    function createDependencyProposals(range: monacoEditor.IRange) {
      return entities
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
          const contents = entities
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
  }, [entities, monacoRef]);
}

function useCodeLens(
  editorRef: RefObject<MonacoEditor>,
  monacoRef: RefObject<typeof monacoEditor>
) {
  const dispatch = useDispatch();
  const { entities } = useSelector((state: RootState) => {
    const { flatEntities } = state.entities;
    return {
      entities: flatEntities,
    };
  });

  useEffect(() => {
    const providerMap = entities.map((entity) => {
      const commandId = editorRef?.current?.editor?.addCommand(
        0,
        function () {
          // dispatch(selectEntities([entity._id]));
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
  }, [dispatch, editorRef, entities, monacoRef]);
}

export const TextEditor = React.forwardRef(
  (props: TextEditorProps, ref: Ref<MonacoEditor>) => {
    const { value: propsValue, onChange, options, ...editorProps } = props;
    const [value, setValue] = useState(propsValue);

    useEffect(() => {
      setValue(propsValue ?? "");
    }, [propsValue]);

    useAutoUpdateEditorLayout(ref as RefObject<MonacoEditor>);
    // useAutoComplete(monacoRef);
    // useCodeLens(ref as RefObject<MonacoEditor>, monacoRef);

    return (
      <MonacoEditor
        height={"100%"}
        width={"100%"}
        onChange={(text, e) => {
          setValue(text);

          onChange && onChange(text, e);
        }}
        ref={ref}
        value={value}
        language="markdown"
        options={{
          automaticLayout: true,
          fontSize: 16,
          fontFamily: `
              -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
  'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
  'Noto Color Emoji'
              `,
          contextmenu: false,
          gotoLocation: {
            multiple: "goto",
            multipleDeclarations: "goto",
            multipleDefinitions: "goto",
            multipleImplementations: "goto",
            multipleReferences: "goto",
            multipleTypeDefinitions: "goto",
          },
          ...options,
        }}
        {...editorProps}
      />
    );
  }
);
