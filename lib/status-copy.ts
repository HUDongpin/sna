import type { Locale } from "@/lib/locales";

export type StatusCopy = {
  notFound: {
    title: string;
    text: string;
    cta: string;
  };
  loading: {
    label: string;
  };
  error: {
    title: string;
    text: string;
    retry: string;
  };
};

export const statusCopy: Record<Locale, StatusCopy> = {
  en: {
    notFound: {
      title: "Page not found",
      text: "The page you requested does not exist or may have moved.",
      cta: "Return home",
    },
    loading: {
      label: "Loading",
    },
    error: {
      title: "Something went wrong",
      text: "We could not load this page. Please try again.",
      retry: "Try again",
    },
  },
  "zh-hant": {
    notFound: {
      title: "找不到頁面",
      text: "你所要求的頁面不存在或可能已移動。",
      cta: "返回首頁",
    },
    loading: {
      label: "載入中",
    },
    error: {
      title: "發生錯誤",
      text: "目前無法載入此頁，請再試一次。",
      retry: "再試一次",
    },
  },
  "zh-hans": {
    notFound: {
      title: "找不到页面",
      text: "你所请求的页面不存在或可能已移动。",
      cta: "返回首页",
    },
    loading: {
      label: "加载中",
    },
    error: {
      title: "发生错误",
      text: "目前无法加载此页，请重试。",
      retry: "重试",
    },
  },
};
