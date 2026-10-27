import * as voucherRepository from '../repositories/voucher.repository'
import type { Voucher, VoucherFormValues } from '../types'
import { validateVoucherForm } from '../validations/voucher.validation'

export function createVoucher(values: VoucherFormValues): Promise<Voucher> {
  return voucherRepository.createVoucher(validateVoucherForm(values))
}
