use eternum::alias::ID;
use eternum::models::position::Coord;

use dojo::world::IWorldDispatcher;

#[starknet::interface]
trait IWorldConfig<TContractState> {
    fn set_world_config(
        self: @TContractState, world: IWorldDispatcher, realm_l2_contract: starknet::ContractAddress
    );
}


#[starknet::interface]
trait IWeightConfig<TContractState> {
    fn set_weight_config(
        self: @TContractState, world: IWorldDispatcher, entity_type: u128, weight_gram: u128
    );
}

#[starknet::interface]
trait ICapacityConfig<TContractState> {
    fn set_capacity_config(
        self: @TContractState, world: IWorldDispatcher, entity_type: u128, weight_gram: u128
    );
}

#[starknet::interface]
trait INpcConfig<TContractState> {
    fn set_spawn_config(
        self: @TContractState, world: IWorldDispatcher, spawn_delay: u128
    );
}


#[starknet::interface]
trait ILaborConfig<TContractState> {
    fn set_labor_cost_resources(
        self: @TContractState,
        world: IWorldDispatcher,
        resource_type_labor: felt252,
        resource_types_packed: u128,
        resource_types_count: u8
    );

    fn set_labor_cost_amount(
        self: @TContractState,
        world: IWorldDispatcher,
        resource_type_labor: felt252,
        resource_type_cost: felt252,
        resource_type_value: u128
    );

    fn set_labor_config(
        self: @TContractState,
        world: IWorldDispatcher,
        base_labor_units: u64,
        base_resources_per_cycle: u128,
        base_food_per_cycle: u128
    );

    fn set_labor_auction(
        self: @TContractState,
        world: IWorldDispatcher,
        decay_constant: u128,
        per_time_unit: u128,
        price_update_interval: u128
    );
}

#[starknet::interface]
trait ITransportConfig<TContractState> {
    fn set_road_config(
        self: @TContractState,
        world: IWorldDispatcher,
        fee_resource_type: u8,
        fee_amount: u128,
        speed_up_by: u64
    );

    fn set_speed_config(
        self: @TContractState, world: IWorldDispatcher, entity_type: u128, sec_per_km: u16
    );

    fn set_travel_config(
        self: @TContractState, world: IWorldDispatcher, free_transport_per_city: u128
    );
}


#[starknet::interface]
trait IHyperstructureConfig<TContractState> {
    fn create_hyperstructure(
        self: @TContractState,
        world: IWorldDispatcher,
        hyperstructure_type: u8,
        initialization_resources: Span<(u8, u128)>,
        construction_resources: Span<(u8, u128)>,
        coord: Coord
    ) -> ID;
}
