const encodeId = (id) => encodeURIComponent(String(id ?? "").trim());
const encodeEntity = (entity) =>
  encodeURIComponent(
    String(entity ?? "")
      .trim()
      .toLowerCase(),
  );

export const dataImportApiRoutes = Object.freeze({
  collection: "/imports",
  upload: (entity) => `/imports/${encodeEntity(entity)}/uploads`,
  template: (entity) => `/imports/templates/${encodeEntity(entity)}.csv`,
  customersUpload: "/imports/customers/uploads",
  customerTemplate: "/imports/templates/customers.csv",
  session: (id) => `/imports/${encodeId(id)}`,
  rows: (id) => `/imports/${encodeId(id)}/rows`,
  validate: (id) => `/imports/${encodeId(id)}/validate`,
  execute: (id) => `/imports/${encodeId(id)}/execute`,
  report: (id) => `/imports/${encodeId(id)}/report.csv`,
  rollbackPreview: (id) => `/imports/${encodeId(id)}/rollback-preview`,
  rollback: (id) => `/imports/${encodeId(id)}/rollback`,
  rollbackReport: (id) => `/imports/${encodeId(id)}/rollback-report.csv`,
});
