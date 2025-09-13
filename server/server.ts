import express from "express";
import axios from "axios";
import { DbConnection } from './module_bindings/index.ts';
import {
  Identity, ConnectionId,
} from '@clockworklabs/spacetimedb-sdk';
import { connect } from "http2";

console.log("started");

async function connectspacetime() {
    const db = await DbConnection.builder()
        .withUri("https://maincloud.spacetimedb.com")
        .withModuleName("hophack")
        .build();
    console.log("connected");
    return db;
}

connectspacetime();