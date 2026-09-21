package com.alpheus.NetVanta.entity;

public enum SecurityEventType {

    DEVICE_OFFLINE,     // A monitored device could not be reached
    DEVICE_ONLINE,      // A previously unavailable device has responded again
    HIGH_RESPONSE_TIME  // A device responded, but unusually slowly
}