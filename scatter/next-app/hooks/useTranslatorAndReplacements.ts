import { useCallback, useMemo, useState } from "react";
import { Config, Translations, Cluster } from "@/types";
import * as OpenCC from "opencc-js";

let missing: { [key: string]: boolean } = {};

const JapaneseUI: { [key: string]: string } = {
  Argument: "議論",
  "Original comment": "元のコメント",
  "Representative arguments": "代表的な議論",
  "Open full-screen map": "全画面地図を開く",
  "Back to report": "レポートに戻る",
  "Hide labels": "ラベルを非表示にする",
  "Show labels": "ラベルを表示",
  "Show filters": "フィルターを表示",
  "Hide filters": "フィルターを非表示",
  "Min. votes": "最小投票数",
  Consensus: "コンセンサス",
  Showing: "表示中",
  arguments: "議論",
  "Reset zoom": "ズームをリセット",
  "Click anywhere on the map to close this":
    "このメッセージを閉じるには地図のどこかをクリックしてください",
  "Click on the dot for details": "詳細を見るには点をクリックしてください",
  agree: "同意する",
  disagree: "同意しない",
  Language: "言語",
  English: "英語",
  "of total": "合計",
  Overview: "概要",
  "Cluster analysis": "クラスター分析",
  "Representative comments": "代表的なコメント",
  Introduction: "導入",
  Clusters: "クラスター",
  Appendix: "付録",
  "This report was generated using an AI pipeline that consists of the following steps":
    "このレポートは、以下のステップで構成されるAIパイプラインを使用して生成されました",
  Step: "ステップ",
  extraction: "抽出",
  "show code": "コードを表示",
  "hide code": "コードを非表示",
  "show prompt": "プロンプトを表示",
  "hide prompt": "プロンプトを非表示",
  embedding: "埋め込み",
  clustering: "クラスタリング",
  labelling: "ラベリング",
  takeaways: "まとめ",
  overview: "概要",
};

const useTranslatorAndReplacements = (
  config: Config,
  translations: Translations,
  clusters: Cluster[]
) => {
  const [langIndex, setLangIndex] = useState(0);
  const languages = useMemo(() => {
    const translation = config?.translation;
    const names = translation?.languages || [];
    const flags = translation?.flags || [];
    return [
      {
        name: "English",
        flag: "US",
      },
      ...names.map((name, index) => ({
        name,
        flag: flags[index],
      })),
    ];
  }, []);
  const fixLocalLang = useMemo(() => {
    if (languages[langIndex].flag === "TW") {
      return OpenCC.Converter({ from: "cn", to: "twp" });
    } else {
      return (x: string) => x;
    }
  }, [languages[langIndex].flag]);

  const { replaceAll, manualChanges } = useMemo(() => {
    const memory: { [input: string]: string } = {};
    const replacements = config?.visualization?.replacements || [];
    const manualChanges: { from: string; to: string }[] = [];
    let trackChanges = true;
    const replaceAll = (inputString: string) => {
      if (replacements.length === 0) return inputString;
      if (memory[inputString]) return memory[inputString];
      let modifiedString = inputString;
      replacements.forEach((pair) => {
        const { replace, by } = pair;
        modifiedString = modifiedString.split(replace).join(by);
      });
      if (trackChanges && modifiedString !== inputString)
        manualChanges.push({ from: inputString, to: modifiedString });
      memory[inputString] = modifiedString;
      return modifiedString;
    };
    // apply one to all clusters to pre-compute all important replacements
    // TODO: apply translations first if replacements are not for primary language
    clusters.forEach((cluster) => {
      replaceAll(cluster.cluster);
      replaceAll(cluster.takeaways || "");
      cluster.arguments.forEach((arg) => {
        replaceAll(arg.argument);
      });
    });
    trackChanges = false;
    return { replaceAll, manualChanges };
  }, [langIndex]);

  const t = useCallback(
    (txt?: string) => {
      if (!txt) return txt;

      if (langIndex === 0) return replaceAll(txt);
      const result = translations[txt]?.[langIndex - 1];
      if (!result) {
        if (!missing[txt]) {
          missing[txt] = true;
          console.log(`Missing translation for "${txt}"`);
        }
      }
      return fixLocalLang(replaceAll(result || txt));
    },
    [langIndex, replaceAll]
  );
  return { languages, setLangIndex, langIndex, t, manualChanges };
};

export type Translator = ReturnType<typeof useTranslatorAndReplacements>;

export default useTranslatorAndReplacements;
