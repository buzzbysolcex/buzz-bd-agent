pub fn collect_fee(ctx: Context<CollectFee>, amount: u64) -> Result<()> {
    **ctx.accounts.fee_pda.to_account_info().try_borrow_mut_lamports()? += amount;
    Ok(())
}
pub fn withdraw_fees(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    **ctx.accounts.fee_pda.to_account_info().try_borrow_mut_lamports()? -= amount; // egress ix EXISTS
    **ctx.accounts.dest.to_account_info().try_borrow_mut_lamports()? += amount;
    Ok(())
}
