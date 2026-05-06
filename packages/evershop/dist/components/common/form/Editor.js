import { FileBrowser } from '@components/admin/FileBrowser.js';
import { getColumnClasses } from '@components/common/form/editor/GetColumnClasses.js';
import { getRowClasses } from '@components/common/form/editor/GetRowClasses.js';
import { RawToolWrapper } from '@components/common/form/editor/RawToolWrapper.js';
import { RowTemplates } from '@components/common/form/editor/RowTemplates.js';
import { Field, FieldLabel } from '@components/common/ui/Field.js';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CircleX } from 'lucide-react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import './Editor.scss';
async function loadEditorJS() {
    const { default: EditorJS } = await import('@editorjs/editorjs');
    return EditorJS;
}
async function loadEditorJSImage() {
    const { default: ImageTool } = await import('@evershop/editorjs-image');
    return ImageTool;
}
async function loadEditorJSHeader() {
    const { default: Header } = await import('@editorjs/header');
    return Header;
}
async function loadEditorJSList() {
    const { default: List } = await import('@editorjs/list');
    return List;
}
async function loadEditorJSQuote() {
    const { default: Quote } = await import('@editorjs/quote');
    return Quote;
}
// Using custom RawToolWrapper instead to fix backspace issues
// async function loadEditorJSRaw(): Promise<any> {
//   const { default: RawTool } = await import('@editorjs/raw');
//   return RawTool;
// }
const SortableRow = ({ row, removeRow, children })=>{
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: row.id
    });
    const style = {
        transform: transform ? `translateY(${transform.y}px)` : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative'
    };
    return /*#__PURE__*/ React.createElement("div", {
        className: "border border-border row__container mt-3 first:mt-0 rounded-md",
        id: row.id,
        ref: setNodeRef,
        style: style
    }, /*#__PURE__*/ React.createElement("div", {
        className: "config p-3 flex justify-between bg-muted items-center"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "drag__icon cursor-move",
        ...attributes,
        ...listeners
    }, /*#__PURE__*/ React.createElement("svg", {
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        fill: "#949494",
        width: 20,
        height: 20
    }, /*#__PURE__*/ React.createElement("g", null, /*#__PURE__*/ React.createElement("path", {
        fill: "none",
        d: "M0 0h24v24H0z"
    }), /*#__PURE__*/ React.createElement("path", {
        fillRule: "nonzero",
        d: "M14 6h2v2h5a1 1 0 0 1 1 1v7.5L16 13l.036 8.062 2.223-2.15L20.041 22H9a1 1 0 0 1-1-1v-5H6v-2h2V9a1 1 0 0 1 1-1h5V6zm8 11.338V21a1 1 0 0 1-.048.307l-1.96-3.394L22 17.338zM4 14v2H2v-2h2zm0-4v2H2v-2h2zm0-4v2H2V6h2zm0-4v2H2V2h2zm4 0v2H6V2h2zm4 0v2h-2V2h2zm4 0v2h-2V2h2z"
    })))), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("a", {
        href: "#",
        onClick: (e)=>{
            e.preventDefault();
            removeRow(row.id);
        }
    }, /*#__PURE__*/ React.createElement(CircleX, {
        width: 20,
        height: 20
    })))), children);
};
export const Editor = ({ name, value = [], label })=>{
    const [openFileBrowser, setOpenFileBrowser] = React.useState(false);
    const [fileBrowser, setFileBrowser] = React.useState(null);
    const { register, setValue } = useFormContext();
    const [rows, setRows] = React.useState(value ? value.map((row)=>{
        const rowId = `r__${uuidv4()}`;
        return {
            ...row,
            className: getRowClasses(row.size),
            id: row.id || rowId,
            columns: row.columns.map((column)=>{
                const colId = `c__${uuidv4()}`;
                return {
                    ...column,
                    className: getColumnClasses(column.size),
                    id: column.id || colId
                };
            })
        };
    }) : []);
    const editors = React.useRef({});
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8
        }
    }), useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates
    }));
    const handleDragEnd = (event)=>{
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setRows((items)=>{
                const oldIndex = items.findIndex((row)=>row.id === active.id);
                const newIndex = items.findIndex((row)=>row.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    return arrayMove(items, oldIndex, newIndex);
                }
                return items;
            });
        }
    };
    React.useEffect(()=>{
        const initEditors = async ()=>{
            const EditorJS = await loadEditorJS();
            const ImageTool = await loadEditorJSImage();
            const Header = await loadEditorJSHeader();
            const List = await loadEditorJSList();
            const Quote = await loadEditorJSQuote();
            // Using RawToolWrapper instead of loading from @editorjs/raw
            setValue(name, rows);
            rows.forEach((row)=>{
                row.columns.forEach((column)=>{
                    if (!editors.current[column.id]) {
                        editors.current[column.id] = {};
                        editors.current[column.id].instance = new EditorJS({
                            holder: column.id,
                            placeholder: 'Type / to see the available blocks',
                            minHeight: 0,
                            tools: {
                                header: Header,
                                list: List,
                                raw: {
                                    class: RawToolWrapper,
                                    inlineToolbar: false
                                },
                                quote: Quote,
                                image: {
                                    class: ImageTool,
                                    config: {
                                        onSelectFile: (onUpload, onError)=>{
                                            setFileBrowser({
                                                onUpload: (fileUrl)=>{
                                                    onUpload({
                                                        success: 1,
                                                        file: {
                                                            url: fileUrl
                                                        }
                                                    });
                                                },
                                                onError
                                            });
                                            setOpenFileBrowser(true);
                                        }
                                    }
                                }
                            },
                            data: column.data,
                            onChange: (api)=>{
                                api.saver.save().then((outputData)=>{
                                    // Save outputData to the column and trigger re-render
                                    setRows((prevRows)=>{
                                        const newRows = [
                                            ...prevRows
                                        ];
                                        const rowIdx = newRows.findIndex((r)=>r.id === row.id);
                                        const columnIdx = newRows[rowIdx].columns.findIndex((c)=>c.id === column.id);
                                        newRows[rowIdx].columns[columnIdx].data = outputData;
                                        setValue(name, newRows);
                                        return newRows;
                                    });
                                });
                            }
                        });
                    }
                });
            });
        };
        initEditors();
    }, [
        rows.length
    ]);
    const removeRow = (rowId)=>{
        setRows(rows.filter((i)=>i.id !== rowId));
    };
    const addRow = (row)=>{
        setRows(rows.concat(row));
    };
    return /*#__PURE__*/ React.createElement(Field, {
        className: "editor form-field-container"
    }, /*#__PURE__*/ React.createElement(FieldLabel, {
        htmlFor: "description mt-4"
    }, label), /*#__PURE__*/ React.createElement("div", {
        className: "prose prose-xl max-w-none"
    }, /*#__PURE__*/ React.createElement(DndContext, {
        sensors: sensors,
        collisionDetection: closestCenter,
        onDragEnd: handleDragEnd
    }, /*#__PURE__*/ React.createElement(SortableContext, {
        items: rows.map((row)=>row.id),
        strategy: verticalListSortingStrategy
    }, /*#__PURE__*/ React.createElement("div", {
        id: "rows"
    }, rows.map((row)=>// Grid template columns based on the number of columns in the row
        /*#__PURE__*/ React.createElement(SortableRow, {
            key: row.id,
            row: row,
            removeRow: removeRow
        }, /*#__PURE__*/ React.createElement("div", {
            className: `row grid p-5 divide-x divide-dashed ${row.className}`,
            style: {
                minHeight: '30px'
            }
        }, row.columns.map((column)=>/*#__PURE__*/ React.createElement("div", {
                className: `column p-3 ${column.className}`,
                key: column.id
            }, /*#__PURE__*/ React.createElement("div", {
                id: column.id
            }))))))))), /*#__PURE__*/ React.createElement("div", {
        className: "flex justify-center"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "flex justify-center flex-col mt-5"
    }, /*#__PURE__*/ React.createElement(RowTemplates, {
        addRow: addRow
    })))), /*#__PURE__*/ React.createElement("input", {
        type: "hidden",
        ...register(name)
    }), openFileBrowser && /*#__PURE__*/ React.createElement(FileBrowser, {
        onInsert: (url)=>{
            fileBrowser && fileBrowser.onUpload(url);
            setOpenFileBrowser(false);
        },
        close: ()=>setOpenFileBrowser(false),
        isMultiple: false
    }));
};
