/**
 * Hindi meanings for form labels, shown in brackets next to the English label
 * (see the `hi` prop on Input / Select / Textarea).
 */

/** Default charge lines, keyed by ChargeDefinition.id. Custom charges simply get no Hindi. */
export const CHARGE_HINDI: Record<string, string> = {
  freight: "भाड़ा",
  "local-godown": "स्थानीय गोदाम शुल्क",
  unloading: "उतराई शुल्क",
  loading: "लदाई शुल्क",
  statistical: "सांख्यिकीय शुल्क",
  "local-collection": "स्थानीय संग्रह शुल्क",
  cod: "सीओडी शुल्क",
  detention: "रुकाई शुल्क",
  gstin: "जीएसटीआईएन शुल्क",
};
