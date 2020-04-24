import React, {useEffect, useRef, useState} from 'react';
import MonacoEditor from "react-monaco-editor";
import * as monacoEditor from 'monaco-editor';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "./modules";
import {
    Entity, entityDocuments,
    selectEntity, setEntityStore,
} from "./modules/entities";
import {EntityEditor} from "./components/EntityEditor";
import {
    Content,
    contentFixture,
    selectContent, setContentStore,
    updateContent
} from "./modules/content";
import {Button, Menu} from "antd";
import {db, flatToHierarchy} from "./index";
import {useDebounce} from "use-debounce";

function useKeyEntities() {
    const {entities} = useSelector((state: RootState) => state.entities)

    const keyEntities: Entity[] = []

    entities.forEach(entity => {
        entity.entities.forEach(entity => {
            keyEntities.push(entity)
        })
    })

    return keyEntities
}

function App() {
    const dispatch = useDispatch()
    const {content, selectedContent} = useSelector((state: RootState) => {
        const {content, selectedContentId} = state.content
        const selectedContent = state.content.content.find(c => c._id === selectedContentId)

        return {
            selectedContent,
            content
        }
    })
    const {entities} = useSelector((state: RootState) => state.entities)
    const valueFromSelected = selectedContent?.text ?? ''
    const [value, setValue] = useState(valueFromSelected)
    const [text] = useDebounce(value, 1000);
    const keyEntities = useKeyEntities()
    const monacoRef = useRef<typeof monacoEditor>()
    const ref = useRef<MonacoEditor>(null)

    useEffect(() => {
        if (selectedContent) {
            if (selectedContent.text !== text) {
                dispatch(updateContent({
                    ...selectedContent,
                    text
                }))
            }
        }
    }, [text])

    useEffect(() => {
        setValue(valueFromSelected)
    }, [valueFromSelected])

    function editorWillMount(monaco: typeof monacoEditor) {
        monacoRef.current = monaco
    }

    React.useEffect(() => {
        db.bulkDocs([...entityDocuments, ...contentFixture])
            .catch(e => (e))
            .finally(() => {
                db.allDocs({include_docs: true}).then(docs => {
                    const entities = docs.rows.filter(row => {
                        // @ts-ignore
                        return row.doc.type === 'entity'
                    })
                        .map(row => row.doc)

                    // @ts-ignore
                    const content: Content[] = docs.rows.filter(row => row.doc.type === 'content').map(row => row.doc)

                    dispatch(setEntityStore({
                        // @ts-ignore
                        entities: flatToHierarchy(entities)
                    }))
                    dispatch(setContentStore({
                        // @ts-ignore
                        content
                    }))
                })
            })
    }, [])

    function Directory() {
        return (
            <Menu selectedKeys={selectedContent ? [selectedContent._id.toString()] : []} mode={'inline'}>
                <Menu.ItemGroup title={'Entities'}>
                    {entities.map(entity => {
                        return <Menu.Item onClick={() => dispatch(selectEntity(entity._id))}
                                          key={entity.name}>{entity.name}</Menu.Item>
                    })}
                </Menu.ItemGroup>
                <Menu.ItemGroup title={'My Workbook'}>
                    {content.map(cont => {
                        return <Menu.Item onClick={() => dispatch(selectContent(cont._id))}
                                          key={cont._id}>{cont.name}</Menu.Item>
                    })}
                    <Menu.Item><Button type={'primary'}>Add New</Button></Menu.Item>
                </Menu.ItemGroup>
            </Menu>
        )
    }


    useEffect(() => {
        function createDependencyProposals(range: monacoEditor.IRange) {
            return keyEntities
                .filter(entity => entity.shouldAutoComplete)
                .map(entity => {
                    return {
                        label: entity.name,
                        kind: monacoEditor.languages.CompletionItemKind.Function,
                        insertText: entity.name,
                        range
                    }
                })
        }

        const hover = monacoRef?.current?.languages.registerHoverProvider('markdown', {
            provideHover: function (model, position) {

                const contents = keyEntities
                    .filter(entity => model.getWordAtPosition(position)?.word === entity.name)
                    .map(entity => {
                        return {
                            value:
                                "Cmd + click to go to " + entity.name + "\n\n" +
                                "## *" + entity.name + " docs here*"
                        }
                    })

                return {
                    contents
                }
            },
        });

        const completion = monacoRef?.current?.languages.registerCompletionItemProvider('markdown', {
            provideCompletionItems: function (model, position) {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };
                return {
                    suggestions: createDependencyProposals(range)
                };
            }
        });

        return () => {
            hover?.dispose()
            completion?.dispose()
        }
    }, [keyEntities])

    useEffect(() => {
        const providerMap = keyEntities.map(entity => {
            const commandId = ref?.current?.editor?.addCommand(0, function () {
                dispatch(selectEntity(entity._id))
            }, '');

            const provider = monacoRef?.current?.languages.registerCodeLensProvider('markdown', {
                provideCodeLenses: function (model, token) {
                    const matches = model
                        .findMatches(
                            entity.name,
                            true,
                            false,
                            true,
                            null,
                            true,
                        )
                        .reduce((acc, current) => {
                            const dupe = acc.find(item => item.range.startLineNumber === current.range.startLineNumber);

                            if (!dupe) {
                                return acc.concat([current]);
                            }

                            return acc;
                        }, [] as monacoEditor.editor.FindMatch[]);

                    const lenses: monacoEditor.languages.CodeLens[] = matches.map((match) => {
                        return {
                            range: match.range,
                            command: {
                                id: commandId ?? '',
                                title: `@${entity.name}`
                            }
                        }
                    })

                    return {
                        dispose: () => {
                        },
                        lenses
                    };
                }
            });

            return {provider}
        })

        return () => {
            providerMap.forEach(provider => {
                provider.provider?.dispose()
            })
        }
    }, [dispatch, keyEntities])

    return (
        <div style={{height: '100%'}}>
            <div style={{height: '100%', display: 'flex', paddingTop: '1rem', paddingBottom: '1rem'}}>
                <div style={{flex: 1, paddingLeft: '1rem', paddingRight: '1rem'}}>
                    <Directory/>
                </div>
                <div style={{flex: 2}}>
                    <MonacoEditor
                        onChange={(text) => {
                            if (selectedContent) {
                                setValue(text)
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
                                multipleTypeDefinitions: "goto"
                            }
                        }}
                    />
                </div>
                <div style={{flex: 1.5, paddingLeft: '1rem', paddingRight: '1rem'}}>
                    <EntityEditor/>
                </div>
            </div>
        </div>
    );
}

export default App;
