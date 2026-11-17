import { BRAND } from '../../config/brand';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseMonthQuery } from '../../utils/validation';
import { generateExcelReport } from './generators/excel.generator';
import { generatePdfReport } from './generators/pdf.generator';
import { reportsService } from './reports.service';

const fileName = (month: string, ext: string) => `${BRAND.name}-reporte-${month}.${ext}`;

export const reportsController = {
  pdf: asyncHandler((req, res) => {
    const month = parseMonthQuery(req.query);
    const data = reportsService.buildData(month);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName(month, 'pdf')}"`);
    generatePdfReport(data, res);
  }),

  excel: asyncHandler(async (req, res) => {
    const month = parseMonthQuery(req.query);
    const buffer = await generateExcelReport(reportsService.buildData(month));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName(month, 'xlsx')}"`);
    res.send(buffer);
  }),
};
