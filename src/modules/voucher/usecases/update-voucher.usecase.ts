import * as voucherRepository from '../repositories/voucher.repository'
import type { Voucher, VoucherFormValues } from '../types'
import { validateVoucherForm } from '../validations/voucher.validation'

export function updateVoucher(voucherId: string, values: VoucherFormValues): Promise<Voucher> {
  return voucherRepository.updateVoucher(voucherId, validateVoucherForm(values))
}
