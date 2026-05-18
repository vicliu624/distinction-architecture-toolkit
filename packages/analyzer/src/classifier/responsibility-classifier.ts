import type { Responsibility } from "@explicit-architecture/core";

export function classifyResponsibilities(content: string): Responsibility[] {
  const responsibilities: Responsibility[] = [];

  const checks: Array<[RegExp, Responsibility]> = [
    [/BOARD_|board_facts|screen_width|screen_height/i, {
      kind: "hardware-facts",
      description: "Looks like hardware or board facts.",
      confidence: "medium"
    }],
    [/page|screen|route|manifest/i, {
      kind: "page-manifest",
      description: "Looks like page, screen, or route ownership.",
      confidence: "medium"
    }],
    [/layout|font|row|nav|touch/i, {
      kind: "layout-decision",
      description: "Looks like UI layout decision ownership.",
      confidence: "medium"
    }],
    [/render|widget|gtk|lvgl|lv_obj/i, {
      kind: "renderer-creation",
      description: "Looks like renderer or widget construction.",
      confidence: "medium"
    }],
    [/runtime|service|state|store/i, {
      kind: "runtime-state-access",
      description: "Looks like runtime state or service access.",
      confidence: "medium"
    }]
  ];

  for (const [pattern, responsibility] of checks) {
    if (pattern.test(content)) responsibilities.push(responsibility);
  }

  return responsibilities;
}
