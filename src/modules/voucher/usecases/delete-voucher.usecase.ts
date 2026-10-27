import * as voucherRepository from '../repositories/voucher.repository'

/** Deletes a voucher no sale has used. */
export function deleteVoucher(voucherId: string): Promise<void> {
  return voucherRepository.deleteVoucher(voucherId)
}
