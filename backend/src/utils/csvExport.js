/**
 * Institutional Data Extraction Utility — Excel-Compatible 
 * Generates high-fidelity CSV strings for Governance and Compliance.
 */
const generateCSV = (data, fields) => {
  if (!data || !data.length) return "";
  
  // Header Row
  const header = fields.map(f => `"${f.label}"`).join(",") + "\n";
  
  // Data Rows
  const rows = data.map(item => {
    return fields.map(f => {
      let val = item[f.key];
      // Path resolution (e.g. "path.to.value")
      if (f.key.includes('.')) {
        val = f.key.split('.').reduce((o, i) => (o ? o[i] : ""), item);
      }
      
      // Clean and quote for CSV
      const cleanVal = String(val ?? "").replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${cleanVal}"`;
    }).join(",");
  }).join("\n");
  
  return header + rows;
};

module.exports = { generateCSV };
