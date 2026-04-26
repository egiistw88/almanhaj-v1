import * as Y from 'yjs';
import { toByteArray, fromByteArray } from 'base64-js';

// Convert base64 back to a Y.Doc
export function mergeYjs(localBase64: string | null | undefined, remoteBase64: string): { mergedBase64: string, mergedText: string } {
  const ydoc = new Y.Doc();
  
  // Apply local state if it exists
  if (localBase64) {
    try {
      Y.applyUpdate(ydoc, toByteArray(localBase64));
    } catch (e) {
      console.error("Local Yjs parse error:", e);
    }
  }

  // Apply remote state to merge them
  if (remoteBase64) {
    try {
      Y.applyUpdate(ydoc, toByteArray(remoteBase64));
    } catch (e) {
      console.error("Remote Yjs merge error:", e);
    }
  }

  return {
    mergedBase64: fromByteArray(Y.encodeStateAsUpdate(ydoc)),
    mergedText: ydoc.getText('content').toString()
  };
}

// Perform a naive diff to apply simple Textarea updates into Yjs efficiently
export function updateYjsState(base64State: string | null | undefined, oldText: string, newText: string): { newBase64: string, updatedText: string } {
  const ydoc = new Y.Doc();
  
  if (base64State) {
    try {
      Y.applyUpdate(ydoc, toByteArray(base64State));
    } catch (e) {
      // If corrupted, we continue with empty doc
    }
  }

  const ytext = ydoc.getText('content');
  
  // Ensure we have parity. If the yjs recovered text is different from what React expects
  // (e.g. initial adoption of Yjs, or sync lag), we shouldn't diff linearly.
  const currentYjsText = ytext.toString();
  
  if (currentYjsText !== oldText && currentYjsText.length > 0) {
     // Safety: If there's a serious mismatch between React state and Yjs state before editing,
     // we do a full rewrite to guarantee parity
     ytext.delete(0, ytext.length);
     ytext.insert(0, newText);
  } else {
    // Naive prefix-suffix Fast-Diff Calculation
    let start = 0;
    while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) {
      start++;
    }
    let endOld = oldText.length - 1;
    let endNew = newText.length - 1;
    while (endOld >= start && endNew >= start && oldText[endOld] === newText[endNew]) {
      endOld--;
      endNew--;
    }
    
    const deleteCount = endOld - start + 1;
    const insertString = newText.substring(start, endNew + 1);

    try {
      if (deleteCount > 0) ytext.delete(start, deleteCount);
      if (insertString.length > 0) ytext.insert(start, insertString);
    } catch (e) {
      // Fallback: full wipe and rewrite if out of bounds exceptions occur
      const len = ytext.length;
      ytext.delete(0, len);
      ytext.insert(0, newText);
    }
  }

  return {
    newBase64: fromByteArray(Y.encodeStateAsUpdate(ydoc)),
    updatedText: ytext.toString()
  };
}
