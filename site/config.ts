/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { SocialObjects } from "@/lib/types";

export const SITE = {
  website: "https://google.github.io/dotprompt", // replace this with your deployed domain
  author: "Firebase",
  desc: "Dotprompt: The executable GenAI prompt format.",
  title: "Dotprompt",
  ogImage: "og-image.jpg",
  repo: "https://github.com/google/dotprompt",
};

export const LOCALE = {
  lang: "en", // html lang code. Set this empty and default will be "en"
  langTag: ["en-EN"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const menu_items: { title: string; href: string }[] = [
  // {
  //   title: "Home",
  //   href: "/",
  // },
];

// Just works with top-level folders and files. For files, don't add extension as it looks for the slug, and not the file name.
export const side_nav_menu_order: string[] = [
  "getting-started",
  "implementations",
  "reference",
  "implementors",
];

// Don't delete anything. You can use 'true' or 'false'.
// These are global settings
export const docconfig = {
  hide_table_of_contents: false,
  hide_breadcrumbs: false,
  hide_side_navigations: false,
  hide_datetime: false,
  hide_time: true,
  hide_search: false,
  hide_repo_button: false,
  hide_author: true,
};

// Set your social. It will appear in footer. Don't change the `name` value.
export const Socials: SocialObjects = [
  {
    name: "GitHub",
    href: "https://github.com/firebase/",
    linkTitle: `Firebase on Github`,
    active: true,
  },
  {
    name: "Twitter",
    href: "https://twitter.com/firebase/",
    linkTitle: `Firebase on Twitter`,
    active: true,
  },
  {
    name: "YouTube",
    href: "https://youtube.com/firebase",
    linkTitle: `Firebase on YouTube`,
    active: true,
  },
  // {
  //   name: "Discord",
  //   href: "https://discord.gg/tWZRBhaPhd",
  //   linkTitle: `${SITE.title} on Discord`,
  //   active: false,
  // },
  // {
  //   name: "Reddit",
  //   href: "https://github.com/HYP3R00T/",
  //   linkTitle: `${SITE.title} on Reddit`,
  //   active: false,
  // },
];
