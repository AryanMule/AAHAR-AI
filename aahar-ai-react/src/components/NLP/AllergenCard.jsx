function getRiskStyle(risk) {
  switch (risk) {
    case "definite":
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        label: "🔴 HIGH RISK",
      };
    case "likely":
      return {
        bg: "bg-orange-100",
        text: "text-orange-700",
        label: "🟠 MEDIUM RISK",
      };
    default:
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        label: "🟡 LOW RISK",
      };
  }
}

function AllergenCard({ allergen }) {
  const style = getRiskStyle(allergen.risk);

  return (
    <div className={`p-4 rounded-xl shadow ${style.bg}`}>

      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">{allergen.name}</h3>
        <span className={`text-xs px-2 py-1 rounded ${style.text}`}>
          {style.label}
        </span>
      </div>

      {/* TRIGGERS */}
      <div className="flex flex-wrap gap-2 mb-2">
        {allergen.triggers?.map((t, i) => (
          <span
            key={i}
            className="text-xs bg-white px-2 py-1 rounded"
          >
            {t}
          </span>
        ))}
      </div>

      {/* EXPLANATION */}
      <p className="text-sm">{allergen.explanation}</p>

      {/* PERSONAL NOTE */}
      {allergen.personalNote && (
        <p className="text-xs mt-2 font-medium">
          {allergen.personalNote}
        </p>
      )}
    </div>
  );
}

export default AllergenCard;