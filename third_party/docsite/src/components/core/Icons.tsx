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

import { Mail, type LucideIcon } from "lucide-react";

import {
  Github,
  Facebook,
  Instagram,
  Linkedin,
  X as Twitter,
  Twitch,
  Youtube,
  Whatsapp,
  Snapchat,
  Pinterest,
  Discord,
  Gitlab,
  Reddit,
  Telegram,
  Mastodon,
} from "simple-icons-astro";

type IconComponent = LucideIcon | ((props: any) => JSX.Element);

export const ICONS: { [key: string]: IconComponent } = {
  Github,
  Facebook,
  Instagram,
  LinkedIn: Linkedin,
  Mail,
  Twitter,
  Twitch,
  YouTube: Youtube,
  WhatsApp: Whatsapp,
  Snapchat,
  Pinterest,
  Discord,
  GitLab: Gitlab,
  Reddit,
  Telegram,
  Mastodon,
};

export const getIconByName = (name: string): IconComponent | null => {
  return ICONS[name] || null;
};
