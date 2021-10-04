import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "prosemirror-schema-basic";
import { undo, redo, history } from "prosemirror-history"
import { keymap } from "prosemirror-keymap"
import { baseKeymap } from "prosemirror-commands"
import React, { useEffect, useRef } from "react";

/*
 * - [Lightweight React integration example - Show - discuss.ProseMirror](https://discuss.prosemirror.net/t/lightweight-react-integration-example/2680)
 * - [ProseMirror Guide](https://prosemirror.net/docs/guide/)
 * - [ProseMirror Reference manual](https://prosemirror.net/docs/ref/#commands)
 * - [remirror/remirror: ProseMirror toolkit for React 🎉](https://github.com/remirror/remirror)
 */

function Editor(props) {
  const ref = useRef();

  useEffect(() => {
    const state = EditorState.create({
      schema,
      plugins: [
        history(),
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
        }),
        keymap(baseKeymap),
      ]
    });
    const view = new EditorView(ref.current, {
      state,
      dispatchTransaction: (transaction) => {
        console.log(transaction);
        const newState = view.state.apply(transaction)
        view.updateState(newState)
      }
    });
  }, []);

  return <><div ref={ref} /></>;
}

export default function IndexPage() {
  return <div style={{whiteSpace: 'pre'}}><Editor /></div>;
}
