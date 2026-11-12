// Backport of https://github.com/tailwindlabs/headlessui/pull/3906 at
// 803c492ec48f862c1dbfcdde366b09b0b8289b23. See THIRD_PARTY_NOTICES.md.
// Keep the package's existing module formats; change only its transition waiter.
export const headlessUITransitionBackport = {
  name: "@headlessui/react",
  version: "2.2.10",
  files: [
    {
      path: "dist/hooks/use-transition.js",
      originalSha256:
        "0a425644fc13bea8c464ac72d65aac568c6c82501c2ff55100107218e88dd4a9",
      patchedSha256:
        "6fbccdc7ebfcb963ede3cb0103f7c16ddff1426f866fedaa6a69f04e492fcaf3",
      replacements: [
        {
          from: "function M(e,r){var a,s;let t=m();if(!e)return t.dispose;let n=!1;t.add(()=>{n=!0});let i=(s=(a=e.getAnimations)==null?void 0:a.call(e).filter(o=>o instanceof CSSTransition))!=null?s:[];return i.length===0?(r(),t.dispose):(Promise.allSettled(i.map(o=>o.finished)).then(()=>{n||r()}),t.dispose)}",
          to: "function M(e,r){let t=m();if(!e)return t.dispose;let n=!1;t.add(()=>{n=!0});function wait(){let transitions=getPendingTransitionsForBackport(e);if(transitions.length===0){r();return}Promise.allSettled(transitions.map(transition=>transition.finished)).then(()=>{if(!n)wait()})}wait();return t.dispose}",
        },
        {
          from: 'function D(e){var t,n;return((n=(t=e.getAnimations)==null?void 0:t.call(e))!=null?n:[]).some(i=>i instanceof CSSTransition&&i.playState!=="finished")}',
          to: 'function getPendingTransitionsForBackport(e){var t,n;return((n=(t=e.getAnimations)==null?void 0:t.call(e))!=null?n:[]).filter(i=>i instanceof CSSTransition&&i.playState!=="finished")}function D(e){return getPendingTransitionsForBackport(e).length>0}',
        },
      ],
    },
    {
      path: "dist/headlessui.dev.cjs",
      originalSha256:
        "f0e4e0e2f1ea3a465703bf1d574c1fe09c7ae37dad0272980ce35b81dcd1378f",
      patchedSha256:
        "e85382a4beb9f3c8b7fb6935037b25d55649bdd2f1adb0389d03dea011e2df48",
      replacements: [
        {
          from: `function waitForTransition(node, done) {
  var _a3, _b2;
  let d = disposables();
  if (!node)
    return d.dispose;
  let cancelled = false;
  d.add(() => {
    cancelled = true;
  });
  let transitions = (_b2 = (_a3 = node.getAnimations) == null ? void 0 : _a3.call(node).filter((animation) => animation instanceof CSSTransition)) != null ? _b2 : [];
  if (transitions.length === 0) {
    done();
    return d.dispose;
  }
  Promise.allSettled(transitions.map((transition2) => transition2.finished)).then(() => {
    if (!cancelled) {
      done();
    }
  });
  return d.dispose;
}`,
          to: `function waitForTransition(node, done) {
  let d = disposables();
  if (!node)
    return d.dispose;
  let cancelled = false;
  d.add(() => {
    cancelled = true;
  });
  function wait() {
    let transitions = getPendingTransitionsForBackport(node);
    if (transitions.length === 0) {
      done();
      return;
    }
    Promise.allSettled(transitions.map((transition2) => transition2.finished)).then(() => {
      if (!cancelled) wait();
    });
  }
  wait();
  return d.dispose;
}`,
        },
        {
          from: `function hasPendingTransitions(node) {
  var _a3, _b2;
  let animations = (_b2 = (_a3 = node.getAnimations) == null ? void 0 : _a3.call(node)) != null ? _b2 : [];
  return animations.some((animation) => {
    return animation instanceof CSSTransition && animation.playState !== "finished";
  });
}`,
          to: `function getPendingTransitionsForBackport(node) {
  var _a3, _b2;
  let animations = (_b2 = (_a3 = node.getAnimations) == null ? void 0 : _a3.call(node)) != null ? _b2 : [];
  return animations.filter((animation) => {
    return animation instanceof CSSTransition && animation.playState !== "finished";
  });
}
function hasPendingTransitions(node) {
  return getPendingTransitionsForBackport(node).length > 0;
}`,
        },
      ],
    },
    {
      path: "dist/headlessui.prod.cjs",
      originalSha256:
        "2eef1c1a1099f4e4e7a8fc4ab29ab3c315d53378307f74f648255c8de04aa01b",
      patchedSha256:
        "abf2850ad631744c953b8dd809e129b706f2f2dfe8374ffd7c3a061c035e3c19",
      replacements: [
        {
          from: "function dd(e,n){var i,s;let t=de();if(!e)return t.dispose;let o=!1;t.add(()=>{o=!0});let r=(s=(i=e.getAnimations)==null?void 0:i.call(e).filter(l=>l instanceof CSSTransition))!=null?s:[];return r.length===0?(n(),t.dispose):(Promise.allSettled(r.map(l=>l.finished)).then(()=>{o||n()}),t.dispose)}",
          to: "function dd(e,n){let t=de();if(!e)return t.dispose;let o=!1;t.add(()=>{o=!0});function wait(){let transitions=getPendingTransitionsForBackport(e);if(transitions.length===0){n();return}Promise.allSettled(transitions.map(transition=>transition.finished)).then(()=>{if(!o)wait()})}wait();return t.dispose}",
        },
        {
          from: 'function pd(e){var t,o;return((o=(t=e.getAnimations)==null?void 0:t.call(e))!=null?o:[]).some(r=>r instanceof CSSTransition&&r.playState!=="finished")}',
          to: 'function getPendingTransitionsForBackport(e){var t,o;return((o=(t=e.getAnimations)==null?void 0:t.call(e))!=null?o:[]).filter(r=>r instanceof CSSTransition&&r.playState!=="finished")}function pd(e){return getPendingTransitionsForBackport(e).length>0}',
        },
      ],
    },
  ],
};
