export const WORKSPACE_BRUSH_TEXTURES = Object.freeze({
  arc: Object.freeze({
    src: "/images/workspace/brush-arc-orbit.webp",
    width: 1254,
    height: 1254,
    aspect: "1 / 1",
  }),
  diagonal: Object.freeze({
    src: "/images/workspace/brush-diagonal-rake.webp",
    width: 1254,
    height: 1254,
    aspect: "1 / 1",
  }),
  crescent: Object.freeze({
    src: "/images/workspace/brush-wide-crescent.webp",
    width: 1774,
    height: 887,
    aspect: "2 / 1",
  }),
});

export const WORKSPACE_BRUSH_PRESETS = Object.freeze({
  sidebar: Object.freeze([
    Object.freeze({
      texture: "arc",
      tone: "coral",
      side: "left",
      className:
        "-bottom-[15rem] -left-[15rem] w-[38rem] -rotate-[7deg] opacity-[0.34] [@media(max-height:760px)]:opacity-[0.24]",
    }),
    Object.freeze({
      texture: "crescent",
      tone: "peach",
      side: "right",
      className:
        "-bottom-6 -right-[18rem] w-[34rem] rotate-[7deg] opacity-[0.2] [@media(max-height:760px)]:opacity-[0.14]",
    }),
    Object.freeze({
      texture: "diagonal",
      tone: "cobalt",
      side: "right",
      className:
        "-bottom-[18rem] -right-[20rem] w-[38rem] rotate-[16deg] opacity-[0.1] [@media(max-height:760px)]:opacity-[0.07]",
    }),
  ]),
  shell: Object.freeze([
    Object.freeze({
      texture: "diagonal",
      tone: "coral",
      side: "left",
      className:
        "-left-[23rem] top-44 w-[38rem] -rotate-[12deg] opacity-[0.12] sm:-left-[26rem] sm:w-[50rem] sm:opacity-[0.17] xl:-left-[30rem] xl:w-[62rem] xl:opacity-[0.2]",
    }),
    Object.freeze({
      texture: "crescent",
      tone: "cobalt",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 md:visible md:-right-[34rem] md:top-[34rem] md:w-[56rem] md:rotate-[12deg] md:opacity-[0.14] xl:-right-[38rem] xl:w-[68rem] xl:opacity-[0.2]",
    }),
  ]),
  overviewShell: Object.freeze([
    Object.freeze({
      texture: "crescent",
      tone: "cobalt",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 md:visible md:-right-[30rem] md:top-[30rem] md:w-[54rem] md:rotate-[10deg] md:opacity-[0.11] xl:-right-[33rem] xl:w-[64rem] xl:opacity-[0.17]",
    }),
    Object.freeze({
      texture: "diagonal",
      tone: "coral",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 lg:visible lg:-right-[39rem] lg:top-[48rem] lg:w-[64rem] lg:rotate-[18deg] lg:opacity-[0.09] xl:-right-[42rem] xl:w-[72rem] xl:opacity-[0.14]",
    }),
  ]),
  overviewTopbar: Object.freeze([
    Object.freeze({
      texture: "arc",
      tone: "coral",
      side: "right",
      className:
        "-right-[18rem] -top-[23rem] w-[48rem] rotate-[12deg] opacity-[0.12] sm:-right-[20rem] sm:w-[54rem] sm:opacity-[0.16] xl:-right-[17rem] xl:-top-[25rem] xl:w-[62rem] xl:opacity-[0.2]",
    }),
    Object.freeze({
      texture: "crescent",
      tone: "cobalt",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 md:visible md:-right-[20rem] md:-top-[15rem] md:w-[36rem] md:rotate-[8deg] md:opacity-[0.08] xl:-right-[18rem] xl:w-[42rem] xl:opacity-[0.12]",
    }),
  ]),
  bookingShell: Object.freeze([
    Object.freeze({
      texture: "arc",
      tone: "coral",
      side: "left",
      className:
        "-bottom-[18rem] -left-[26rem] w-[52rem] -rotate-[10deg] opacity-[0.12] sm:-left-[30rem] sm:w-[64rem] sm:opacity-[0.17] xl:-bottom-[24rem] xl:-left-[34rem] xl:w-[72rem] xl:opacity-[0.2]",
    }),
    Object.freeze({
      texture: "diagonal",
      tone: "cobalt",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 md:visible md:-right-[35rem] md:top-24 md:w-[60rem] md:rotate-[12deg] md:opacity-[0.14] xl:-right-[42rem] xl:w-[76rem] xl:opacity-[0.22]",
    }),
  ]),
  peopleShell: Object.freeze([
    Object.freeze({
      texture: "diagonal",
      tone: "coral",
      side: "left",
      className:
        "-left-[27rem] top-[24rem] w-[54rem] -rotate-[16deg] opacity-[0.12] sm:-left-[32rem] sm:w-[66rem] sm:opacity-[0.17] xl:-left-[38rem] xl:w-[78rem] xl:opacity-[0.22]",
    }),
    Object.freeze({
      texture: "crescent",
      tone: "cobalt",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 md:visible md:-right-[32rem] md:top-16 md:w-[56rem] md:rotate-[9deg] md:opacity-[0.14] xl:-right-[38rem] xl:w-[70rem] xl:opacity-[0.22]",
    }),
  ]),
  operationsShell: Object.freeze([
    Object.freeze({
      texture: "crescent",
      tone: "peach",
      side: "left",
      className:
        "-left-[30rem] -top-20 w-[54rem] -rotate-[9deg] opacity-[0.12] sm:-left-[34rem] sm:w-[64rem] sm:opacity-[0.18] xl:-left-[40rem] xl:w-[76rem] xl:opacity-[0.22]",
    }),
    Object.freeze({
      texture: "arc",
      tone: "cobalt",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 md:visible md:-bottom-[22rem] md:-right-[34rem] md:top-auto md:w-[60rem] md:rotate-[13deg] md:opacity-[0.12] xl:-bottom-[30rem] xl:-right-[40rem] xl:w-[74rem] xl:opacity-[0.2]",
    }),
  ]),
  communicationsShell: Object.freeze([
    Object.freeze({
      texture: "arc",
      tone: "coral",
      side: "left",
      className:
        "-left-[28rem] -top-28 w-[52rem] -rotate-[18deg] opacity-[0.1] sm:-left-[32rem] sm:w-[64rem] sm:opacity-[0.15] xl:-left-[38rem] xl:w-[76rem] xl:opacity-[0.2]",
    }),
    Object.freeze({
      texture: "diagonal",
      tone: "cobalt",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 md:visible md:-bottom-[20rem] md:-right-[36rem] md:top-auto md:w-[62rem] md:rotate-[15deg] md:opacity-[0.12] xl:-bottom-[28rem] xl:-right-[42rem] xl:w-[76rem] xl:opacity-[0.2]",
    }),
  ]),
  calendarShell: Object.freeze([
    Object.freeze({
      texture: "diagonal",
      tone: "coral",
      side: "left",
      className:
        "-bottom-[20rem] -left-[31rem] w-[54rem] -rotate-[13deg] opacity-[0.08] sm:-left-[35rem] sm:w-[66rem] sm:opacity-[0.1] xl:-left-[41rem] xl:w-[78rem] xl:opacity-[0.12]",
    }),
    Object.freeze({
      texture: "crescent",
      tone: "cobalt",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 lg:visible lg:-right-[40rem] lg:-top-28 lg:w-[66rem] lg:rotate-[8deg] lg:opacity-[0.1] xl:-right-[46rem] xl:w-[80rem] xl:opacity-[0.13]",
    }),
  ]),
  overviewHero: Object.freeze([
    Object.freeze({
      texture: "arc",
      tone: "coral",
      side: "left",
      className:
        "-bottom-32 -left-[20rem] w-[50rem] -rotate-[16deg] opacity-[0.28] sm:-bottom-48 sm:-left-[18rem] sm:w-[56rem] sm:opacity-[0.34] xl:-bottom-72 xl:-left-[20rem] xl:w-[64rem] xl:opacity-[0.42]",
    }),
    Object.freeze({
      texture: "diagonal",
      tone: "cobalt",
      side: "right",
      className:
        "invisible right-0 top-0 w-0 lg:visible lg:-right-[20rem] lg:-top-[18rem] lg:w-[48rem] lg:rotate-[18deg] lg:opacity-[0.3] xl:-right-[24rem] xl:-top-[20rem] xl:w-[54rem] xl:opacity-[0.4]",
    }),
  ]),
  editorHero: Object.freeze([
    Object.freeze({
      texture: "crescent",
      tone: "coral",
      side: "right",
      className:
        "-right-[22rem] -top-24 w-[42rem] rotate-[7deg] opacity-[0.1] sm:-right-[26rem] sm:w-[54rem] sm:opacity-[0.14] 2xl:-right-[28rem] 2xl:w-[60rem] 2xl:opacity-[0.16]",
    }),
  ]),
  settingsShell: Object.freeze([
    Object.freeze({
      texture: "crescent",
      tone: "peach",
      side: "left",
      className:
        "-right-[28rem] -top-32 w-[52rem] rotate-[8deg] opacity-[0.16] sm:-right-[30rem] sm:w-[60rem] sm:opacity-[0.22] xl:-right-[34rem] xl:w-[68rem] xl:opacity-[0.28]",
    }),
  ]),
  settingsHero: Object.freeze([
    Object.freeze({
      texture: "arc",
      tone: "cobalt",
      side: "right",
      className:
        "-right-[22rem] -top-[25rem] w-[46rem] rotate-[14deg] opacity-[0.24] sm:-right-[24rem] sm:-top-[28rem] sm:w-[54rem] sm:opacity-[0.34] lg:-right-[25rem] lg:w-[60rem] lg:opacity-[0.44]",
    }),
    Object.freeze({
      texture: "diagonal",
      tone: "coral",
      side: "left",
      className:
        "-bottom-[16rem] -left-[18rem] w-[42rem] -rotate-[18deg] opacity-[0.2] sm:-bottom-[26rem] sm:-left-[27rem] sm:w-[50rem] sm:opacity-[0.3] lg:-left-[28rem] lg:w-[56rem] lg:opacity-[0.4]",
    }),
  ]),
  settingsLaunch: Object.freeze([
    Object.freeze({
      texture: "crescent",
      tone: "cobalt",
      side: "right",
      className:
        "-bottom-16 -right-[24rem] w-[44rem] rotate-[10deg] opacity-[0.18] sm:-right-[26rem] sm:w-[52rem] sm:opacity-[0.26]",
    }),
  ]),
  launchHero: Object.freeze([
    Object.freeze({
      texture: "arc",
      tone: "coral",
      side: "right",
      className:
        "-bottom-32 -right-16 w-[54rem] rotate-[14deg] opacity-[0.28] sm:-bottom-48 sm:-right-[26rem] sm:w-[62rem] sm:opacity-[0.38] lg:-bottom-64 lg:-right-[28rem] lg:w-[68rem] lg:opacity-[0.48]",
    }),
    Object.freeze({
      texture: "crescent",
      tone: "peach",
      side: "left",
      className:
        "-bottom-24 -left-24 w-[44rem] -rotate-[8deg] opacity-[0.2] sm:-bottom-28 sm:-left-32 sm:w-[52rem] sm:opacity-[0.26] lg:-bottom-32 lg:-left-40 lg:w-[58rem] lg:opacity-[0.32]",
    }),
  ]),
});
