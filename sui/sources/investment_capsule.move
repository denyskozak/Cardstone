module metacards::investment_capsule {
    use sui::balance;
    use sui::clock::Clock;
    use sui::coin;
    use sui::object;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::signer;

    const E_TOO_EARLY: u64 = 0;
    const E_NOT_BENEFICIARY: u64 = 1;

    /// A time-locked container that escrows a token balance until the
    /// release time is reached.
    struct InvestmentCapsule<phantom T> has key {
        id: object::UID,
        beneficiary: address,
        release_time_ms: u64,
        locked: balance::Balance<T>,
    }

    /// Create a new capsule with an initial deposit. The object is owned
    /// by the sender so they can manage additional deposits.
    public entry fun create<T>(
        owner: &signer,
        release_time_ms: u64,
        initial: coin::Coin<T>,
        ctx: &mut TxContext,
    ) {
        let capsule = InvestmentCapsule<T> {
            id: object::new(ctx),
            beneficiary: signer::address_of(owner),
            release_time_ms,
            locked: coin::into_balance(initial),
        };
        transfer::transfer(capsule, signer::address_of(owner));
    }

    /// Deposit additional tokens into an existing capsule.
    public entry fun deposit<T>(_depositor: &signer, capsule: &mut InvestmentCapsule<T>, extra: coin::Coin<T>) {
        balance::join(&mut capsule.locked, coin::into_balance(extra));
    }

    /// Withdraw the entire balance once the release time is reached. Only
    /// the designated beneficiary can claim funds.
    public entry fun withdraw<T>(
        caller: &signer,
        capsule: &mut InvestmentCapsule<T>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(signer::address_of(caller) == capsule.beneficiary, E_NOT_BENEFICIARY);
        assert!(clock::now_ms(clock) >= capsule.release_time_ms, E_TOO_EARLY);

        let coins = coin::from_balance(balance::extract(&mut capsule.locked), ctx);
        transfer::public_transfer(coins, capsule.beneficiary);
    }
}
