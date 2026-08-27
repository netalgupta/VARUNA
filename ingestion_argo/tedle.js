import axios from "axios";

const BASE =
  "https://www.ifremer.fr/erddap/tabledap/ArgoFloats-synthetic-BGC.csv";

const windows = [
  ["2026-08-18T00:00:00Z", "2026-08-20T00:00:00Z"],
  ["2026-08-19T00:00:00Z", "2026-08-21T00:00:00Z"],
  ["2026-08-20T00:00:00Z", "2026-08-22T00:00:00Z"],
];

for (const [start, end] of windows) {
  const url =
    `${BASE}?platform_number,time,latitude,longitude` +
    `&time>=${start}` +
    `&time<${end}` +
    `&latitude>=0&latitude<=30` +
    `&longitude>=50&longitude<=100`;

  console.log("\n========================================");
  console.log(`${start} -> ${end}`);
  console.log("========================================");

  try {
    const response = await axios.get(url, {
      timeout: 120000,
      responseType: "text",
    });

    console.log("HTTP:", response.status);

    const lines = response.data.trim().split("\n");

    console.log("Rows returned:", Math.max(0, lines.length - 2));

    if (lines.length > 2) {
      console.log("First data row:");
      console.log(lines[2]);

      console.log("\nLast data row:");
      console.log(lines[lines.length - 1]);
    }

  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);
  }
}