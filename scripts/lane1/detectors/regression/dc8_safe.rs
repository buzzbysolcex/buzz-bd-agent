#[derive(Accounts)]
pub struct WithdrawSafe<'info> {
    #[account(mut, has_one = owner)]
    pub vault: Account<'info, Vault>,
    pub owner: Signer<'info>,
}
pub fn withdraw_safe(ctx: Context<WithdrawSafe>, amount: u64) -> Result<()> {
    Ok(()) // struct-level has_one = canonical, NOT DC-8
}
