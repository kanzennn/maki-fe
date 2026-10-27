import * as voucherRepository from '../repositories/voucher.repository'
import type { Voucher } from '../types'

export function getVoucher(voucherId: string): Promise<Voucher> {
  return voucherRepository.getVoucher(voucherId)
}
