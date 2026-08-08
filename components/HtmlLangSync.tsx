"use client";

import { useEffect } from "react";

export default function HtmlLangSync({ lang, dir }: { lang: string; dir: "ltr" | "rtl" }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [dir, lang]);

  return null;
}
