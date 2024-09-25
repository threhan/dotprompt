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

import { Calendar } from "lucide-react";

import type { DatetimesFormatProps, DatetimesProps } from "@/lib/types";
import { LOCALE } from "config";

export default function Datetime({
  hide_datetime,
  hide_time,
  pubDatetime,
  modDatetime,
  className,
}: DatetimesProps) {
  if (hide_datetime) {
    return;
  }
  return (
    <div
      className={`flex items-center text-muted-foreground gap-2 ${className}`}
    >
      <Calendar className="w-[1.2rem]" />
      <div className="italic text-sm">
        <FormattedDatetime
          pubDatetime={pubDatetime}
          modDatetime={modDatetime}
          hide_time={hide_time}
        />
      </div>
    </div>
  );
}

function FormattedDatetime({
  pubDatetime,
  modDatetime,
  hide_time,
}: DatetimesFormatProps) {
  const myDatetime: Date = new Date(
    modDatetime && modDatetime > pubDatetime ? modDatetime : pubDatetime,
  );

  const date: string = myDatetime.toLocaleDateString(LOCALE.langTag, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const time: string = myDatetime.toLocaleTimeString(LOCALE.langTag, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <time dateTime={myDatetime.toISOString()}>
        {date}
        {!hide_time && <> {time}</>}
      </time>
    </>
  );
}
