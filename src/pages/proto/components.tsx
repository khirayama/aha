import * as React from 'react';

import { afterRendering, findNextBlock, findPrevBlock } from './utils';

import styles from './index.module.scss';

export class Text extends React.Component {
  constructor(props) {
    super(props);
    this.ref = React.createRef(null);
  }

  public componentDidMount() {
    const el = this.ref.current;
    if (el.childNodes.length === 0) {
      const textNode = document.createTextNode('');
      el.appendChild(textNode);
    }
  }

  public shouldComponentUpdate(nextProps) {
    this.manualDiffPatch(nextProps);
    return false;
  }

  private manualDiffPatch(nextProps) {
    const el = this.ref.current;
    const block = {
      id: el.parentNode.getAttribute('blockid'),
      indent: Number(el.getAttribute('indent')),
      text: el.innerText,
    };
    const nextBlock = nextProps.block;

    /* block.text */
    if (nextBlock.text !== block.text) {
      el.blur();
      el.innerText = nextBlock.text;
    }

    /* block.indent */
    if (nextBlock.indent !== block.indent) {
      el.setAttribute('indent', nextBlock.indent);
    }
  }

  public render() {
    const block = this.props.block;

    return (
      <span
        ref={this.ref}
        contentEditable
        className={styles['text']}
        indent={block.indent}
        dangerouslySetInnerHTML={{ __html: block.text }}
        onKeyDown={(e) => this.props.onKeyDown(e, this.props)}
        onInput={(e) => this.props.onInput(e, this.props)}
      />
    );
  }
}

export function Block(props) {
  const block = props.block;
  const schm = props.schema.find(block.type);
  const ref = React.useRef(null);

  const handleTouchStart = React.useCallback((event) => {
    if (event.target.classList.contains(styles['handle'])) {
      event.preventDefault();
    }
  });

  React.useEffect(() => {
    if (ref.current) {
      ref.current.addEventListener('touchstart', handleTouchStart, { passive: false });
      ref.current.addEventListener('touchmove', handleTouchStart, { passive: false });
    }
    return () => {
      if (ref.current) {
        ref.current.removeEventListener('touchstart', handleTouchStart);
        ref.current.removeEventListener('touchmove', handleTouchStart);
      }
    };
  });

  return (
    <div className={styles['block']} ref={ref} blockid={block.id}>
      <span
        className={styles['handle']}
        onPointerDown={(event) => {
          event.preventDefault();
          // event.dataTransfer.setData('text/plain', null);
          event.target.parentNode.style.opacity = 0.5;
        }}
        onTouchMove={(event) => {
          console.log(event.type, props);
          // event.preventDefault();
          event.target.parentNode.style.opacity = 0.1;
        }}
        onPointerEnter={(event) => {
          console.log(event.type, props);
          // event.preventDefault();
          event.target.parentNode.style.opacity = 0.1;
        }}
        onPointerUp={(event) => {
          console.log(event.type, props);
          event.target.parentNode.style.opacity = '';
        }}
      >
        HHH
      </span>
      {schm.component(props)}
    </div>
  );
}

export class Blocks extends React.Component {
  private state: {
    blocks: { id: string; text: string }[];
  } = {
    blocks: [],
  };

  private schema: any;

  constructor(props) {
    super(props);
    this.state = { blocks: props.blocks };
    this.schema = props.schema;
    this.onTextKeyDown = this.onTextKeyDown.bind(this);
    this.onTextInput = this.onTextInput.bind(this);
  }

  private onTextKeyDown(event, props, state) {
    const blocks = this.state.blocks;
    const block = props.block;

    const defaultSchema = this.schema.defaultSchema();

    const el = event.currentTarget;
    const key = event.key;
    const meta = event.metaKey;
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey;

    const sel = window.getSelection();

    if ((key === 'b' && ctrl) || (key === 'i' && ctrl) || (key === 's' && ctrl)) {
      event.preventDefault();
    } else if (key === 'm' && ctrl) {
      event.preventDefault();
      // TODO: Keep selection position
      const newBlocks = [...blocks].map((b) => {
        if (block.id === b.id) {
          return this.schema.createBlock('list', b);
        }
        return {
          ...b,
        };
      });
      this.setState({ blocks: newBlocks });
      // TODO: Projection selection position
    } else if (key === 'Enter') {
      event.preventDefault();

      const textArr = Array.from(block.text);
      const s = Math.min(sel.anchorOffset, sel.focusOffset);
      const e = Math.max(sel.anchorOffset, sel.focusOffset);
      const newText = textArr.splice(e, textArr.length - e);
      textArr.splice(s, e - s);

      const newBlock = this.schema.createBlock(block.type, {
        text: newText.join(''),
        indent: block.indent,
      });
      const newBlocks = [...blocks];
      for (let i = 0; i < blocks.length; i += 1) {
        if (newBlocks[i].id === block.id) {
          newBlocks[i].text = textArr.join('');
          newBlocks.splice(i + 1, 0, newBlock);
          break;
        }
      }
      this.setState({ blocks: newBlocks });
      afterRendering(() => {
        const nextEl = findNextBlock(el);
        if (nextEl) {
          nextEl.focus();
          const range = document.createRange();
          const textNode = nextEl.childNodes[0];
          range.setStart(textNode, 0);
          range.setEnd(textNode, 0);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
    } else if (key === 'Backspace') {
      if (sel.isCollapsed && sel.anchorOffset == 0) {
        /* TODO */
        console.log('Do something', block, defaultSchema);
        if (block.type !== defaultSchema.type) {
          console.log('change to default schema.');
        } else if (block.indent > 0) {
          console.log('outdent');
        } else {
          console.log('combine to prev block');
        }
      }
    } else if (key === 'Tab' && !shift) {
      event.preventDefault();
      const newBlocks = blocks.map((b) => {
        if (b.id === block.id) {
          b.indent = Math.min(b.indent + 1, 8);
        }
        return {
          ...b,
        };
      });
      this.setState({ blocks: newBlocks });
    } else if (key === 'Tab' && shift) {
      event.preventDefault();
      const newBlocks = blocks.map((b) => {
        if (b.id === block.id) {
          b.indent = Math.max(b.indent - 1, 0);
        }
        return {
          ...b,
        };
      });
      this.setState({ blocks: newBlocks });
    } else if (key == 'ArrowDown' && !shift) {
      const selection = document.getSelection();
      if (selection.isCollapsed && selection.focusNode.length === selection.focusOffset) {
        event.preventDefault();
        const nextEl = findNextBlock(el);
        if (nextEl) {
          nextEl.focus();
          const range = document.createRange();
          const textNode = nextEl.childNodes[0];
          range.setStart(textNode, 0);
          range.setEnd(textNode, 0);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } else if (key == 'ArrowUp' && !shift) {
      const selection = document.getSelection();
      if (selection.isCollapsed && selection.anchorOffset === 0) {
        event.preventDefault();
        const prevEl = findPrevBlock(el);
        if (prevEl) {
          prevEl.focus();
          const range = document.createRange();
          const textNode = prevEl.childNodes[0];
          range.setStart(textNode, selection.focusNode.length);
          range.setEnd(textNode, selection.focusNode.length);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
  }

  private onTextInput(event, props, state) {
    const blocks = this.state.blocks;

    const value = event.target.innerText;
    const newBlocks = [...blocks];
    for (let i = 0; i < newBlocks.length; i += 1) {
      if (newBlocks[i].id === props.block.id) {
        newBlocks[i].text = value;
      }
    }
    this.setState({ blocks: newBlocks });
  }

  public render() {
    const blocks = this.state.blocks;

    return (
      <div className={styles['blocks']}>
        {blocks.map((block) => {
          return (
            <Block
              key={block.id}
              schema={this.schema}
              block={block}
              onTextKeyDown={this.onTextKeyDown}
              onTextInput={this.onTextInput}
            />
          );
        })}
      </div>
    );
  }
}
