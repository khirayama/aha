import {
  baseKeymap,
  chainCommands,
  newlineInCode,
  createParagraphNear,
  liftEmptyBlock,
  deleteSelection,
  joinBackward,
  selectNodeBackward,
  splitBlock,
  splitBlockKeepMarks,
} from 'prosemirror-commands';
import { AllSelection, TextSelection } from 'prosemirror-state';
import { Mark } from 'prosemirror-model';
import { canSplit } from 'prosemirror-transform';
import { disconnect } from 'cluster';

// https://github.com/ProseMirror/prosemirror-commands/blob/master/src/commands.js#L236-L242
// function defaultBlockAt(match) {
//   for (let i = 0; i < match.edgeCount; i++) {
//     let { type } = match.edge(i);
//     if (type.isTextblock && !type.hasRequiredAttrs()) return type;
//   }
//   return null;
// }

// https://github.com/ProseMirror/prosemirror-commands/blob/98044bfbff967a323d5c03734a8bf3b5863d3352/src/commands.js#L300-L332
// export function splitBlock(state, dispatch) {
//   let { $from, $to } = state.selection;
//
//   if (dispatch) {
//     let atEnd = $to.parentOffset == $to.parent.content.size;
//     let tr = state.tr;
//     if (state.selection instanceof TextSelection || state.selection instanceof AllSelection) {
//       tr.deleteSelection();
//     }
//     const node = $from.node();
//     let deflt = $from.depth == 0 ? null : defaultBlockAt($from.node(-1).contentMatchAt($from.indexAfter(-1)));
//     let types = atEnd && deflt ? [{ type: deflt, attrs: { indent: node.attrs.indent } }] : null;
//     let can = canSplit(tr.doc, tr.mapping.map($from.pos), 1, types);
//     if (!types && !can && canSplit(tr.doc, tr.mapping.map($from.pos), 1, deflt && [{ type: deflt }])) {
//       types = [{ type: deflt, attrs: { indent: node.attrs.indent } }];
//       can = true;
//     }
//     if (can) {
//       tr.split(tr.mapping.map($from.pos), 1, types);
//       if (!atEnd && !$from.parentOffset && $from.parent.type != deflt) {
//         let first = tr.mapping.map($from.before()),
//           $first = tr.doc.resolve(first);
//         if ($from.node(-1).canReplaceWith($first.index(), $first.index() + 1, deflt))
//           tr.setNodeMarkup(tr.mapping.map($from.before()), deflt);
//       }
//     }
//     dispatch(tr.scrollIntoView());
//   }
//   return true;
// }

export function indent(state, dispatch, view) {
  let tr = state.tr;
  state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
    if (node.type.attrs.indent) {
      tr.setNodeMarkup(pos, null, {
        indent: Math.min(node.attrs.indent + 1, 8),
      });
    }
  });
  view.dispatch(tr);
}

export function outdent(state, dispatch, view) {
  let tr = state.tr;
  state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
    if (node.type.attrs.indent) {
      tr.setNodeMarkup(pos, null, {
        indent: Math.max(node.attrs.indent - 1, 0),
      });
    }
  });
  view.dispatch(tr);
}

function outdentWithEmpty(state, dispatch, view) {
  let isStopPropagation = false;
  state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
    if (node.content.size === 0 && node.attrs.indent) {
      outdent(state, dispatch, view);
      isStopPropagation = true;
    }
  });
  return isStopPropagation;
}

function splitBlockKeepIndent(state, dispatch, view) {
  // console.log(state);
  // console.log(dispatch);
  // console.log(view);
  // state.tr.addStoredMark(new Mark({ indent: 2, attrs: { indent: 3 } }));
  // state.tr.setStoredMarks([new Mark({ indent: 2, attrs: { indent: 3 } })]);
  // console.log(state.tr.storedMarks);
  // return splitBlockKeepMarks(state, dispatch, view);
  return splitBlock(
    state,
    dispatch &&
      ((tr) => {
        // TODO support indent
        let marks = state.storedMarks || (state.selection.$to.parentOffset && state.selection.$from.marks());
        if (marks) tr.ensureMarks(marks);
        dispatch(tr);
      }),
  );
}

const enter = chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlockKeepIndent);
const backspace = chainCommands(deleteSelection, outdentWithEmpty, joinBackward, selectNodeBackward);

export const customKeymap = {
  ...baseKeymap,
  Enter: enter,
  Backspace: backspace,
  'Mod-Backspace': backspace,
  Tab: indent,
  'Shift-Tab': outdent,
};
